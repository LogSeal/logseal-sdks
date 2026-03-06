# frozen_string_literal: true

require "faraday"
require "faraday/retry"
require "json"
require "concurrent-ruby" if defined?(Concurrent)

module LogSeal
  # Main client for the LogSeal audit-logging API.
  #
  #   client = LogSeal::Client.new(api_key: "sk_test_...")
  #   client.emit(action: "user.login", organization_id: "org_acme", actor: { id: "user_1" })
  #   client.shutdown
  #
  class Client
    DEFAULT_BASE_URL = "https://api.logseal.io"
    DEFAULT_BATCH_SIZE = 100
    DEFAULT_FLUSH_INTERVAL = 5 # seconds
    DEFAULT_MAX_RETRIES = 3

    attr_reader :events, :organizations, :schemas, :viewer_tokens, :webhooks, :exports

    # @param api_key [String] Your LogSeal API key.
    # @param base_url [String] Override the API base URL.
    # @param batch_size [Integer] Events to buffer before auto-flushing.
    # @param flush_interval [Integer] Seconds between automatic flushes.
    # @param max_retries [Integer] Retry attempts on 429 / 5xx responses.
    def initialize(api_key:, base_url: DEFAULT_BASE_URL, batch_size: DEFAULT_BATCH_SIZE,
                   flush_interval: DEFAULT_FLUSH_INTERVAL, max_retries: DEFAULT_MAX_RETRIES)
      raise ArgumentError, "api_key is required" if api_key.nil? || api_key.empty?

      @api_key = api_key
      @base_url = base_url
      @batch_size = batch_size
      @flush_interval = flush_interval
      @queue = []
      @mutex = Mutex.new

      @conn = Faraday.new(url: @base_url) do |f|
        f.request :retry, max: max_retries, interval: 1, backoff_factor: 2,
                          retry_statuses: [429, 500, 502, 503, 504]
        f.headers["Authorization"] = "Bearer #{@api_key}"
        f.headers["Content-Type"] = "application/json"
        f.headers["User-Agent"] = "logseal-ruby/#{VERSION}"
      end

      @events = Resources::Events.new(self)
      @organizations = Resources::Organizations.new(self)
      @schemas = Resources::Schemas.new(self)
      @viewer_tokens = Resources::ViewerTokens.new(self)
      @webhooks = Resources::Webhooks.new(self)
      @exports = Resources::Exports.new(self)

      start_flush_thread
    end

    # Queue an event for batched delivery.
    #
    #   client.emit(
    #     action: "document.published",
    #     organization_id: "org_acme",
    #     actor: { id: "user_123", name: "Jane Smith" },
    #     targets: [{ type: "document", id: "doc_456" }],
    #     metadata: { previous_status: "draft" }
    #   )
    #
    # @return [Hash] +{ status: "queued" }+
    def emit(action:, organization_id:, actor:, targets: nil, metadata: nil,
             context: nil, occurred_at: nil, idempotency_key: nil)
      event = { action:, organization_id:, actor:, targets:, metadata:,
                context:, occurred_at:, idempotency_key: }
      validate_event!(event)

      @mutex.synchronize { @queue << event }
      flush if @queue.size >= @batch_size

      { status: "queued" }
    end

    # Emit a single event and wait for server confirmation.
    #
    # @return [Hash] The created event record.
    def emit_sync(action:, organization_id:, actor:, **opts)
      event = { action:, organization_id:, actor:, **opts }
      validate_event!(event)
      request(:post, "/v1/events", body: format_event(event))
    end

    # Flush all queued events immediately.
    #
    # @return [Integer] Number of events accepted.
    def flush
      batch = @mutex.synchronize do
        return 0 if @queue.empty?
        events = @queue.dup
        @queue.clear
        events
      end

      body = { events: batch.map { |e| format_event(e) } }
      begin
        resp = request(:post, "/v1/events/batch", body:)
        resp["accepted"] || 0
      rescue StandardError
        @mutex.synchronize { @queue.unshift(*batch) }
        raise
      end
    end

    # Flush remaining events and stop the background thread.
    def shutdown
      @flush_thread&.kill
      @flush_thread = nil
      flush
    end

    # @api private
    def request(method, path, body: nil, params: nil)
      response = @conn.run_request(method, path, body ? JSON.generate(body) : nil, nil) do |req|
        req.params.update(params) if params
      end

      data = response.body.empty? ? {} : JSON.parse(response.body)

      unless response.success?
        err = data["error"] || {}
        raise Error.new(
          type: err["type"] || "internal_error",
          code: err["code"] || "unknown",
          message: err["message"] || "Unknown error",
          param: err["param"],
          doc_url: err["doc_url"],
          status_code: response.status
        )
      end

      data
    end

    private

    def start_flush_thread
      @flush_thread = Thread.new do
        loop do
          sleep @flush_interval
          flush
        rescue StandardError
          # Swallow — errors surface on next explicit flush
        end
      end
      @flush_thread.abort_on_exception = false
    end

    def validate_event!(event)
      raise Error.new(type: "validation_error", code: "missing_required_field",
                      message: "The 'action' field is required.", param: "action") if event[:action].nil? || event[:action].empty?

      actor = event[:actor]
      raise Error.new(type: "validation_error", code: "missing_required_field",
                      message: "The 'actor[:id]' field is required.", param: "actor.id") if actor.nil? || actor[:id].nil? || actor[:id].to_s.empty?

      raise Error.new(type: "validation_error", code: "missing_required_field",
                      message: "The 'organization_id' field is required.", param: "organization_id") if event[:organization_id].nil? || event[:organization_id].empty?
    end

    def format_event(event)
      payload = {
        action: event[:action],
        organization_id: event[:organization_id],
        actor: event[:actor].compact,
      }
      payload[:targets] = event[:targets].map(&:compact) if event[:targets]
      payload[:metadata] = event[:metadata] if event[:metadata]
      if event[:context]
        payload[:context] = {
          ip_address: event[:context][:ip_address],
          user_agent: event[:context][:user_agent],
          request_id: event[:context][:request_id],
        }.compact
      end
      payload[:occurred_at] = event[:occurred_at] if event[:occurred_at]
      payload[:idempotency_key] = event[:idempotency_key] if event[:idempotency_key]
      payload
    end
  end
end
