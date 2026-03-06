# frozen_string_literal: true

module LogSeal
  module Resources
    class Exports
      def initialize(client)
        @client = client
      end

      # Start a new export job.
      def create(organization_id:, format:, filters: nil)
        body = { organization_id:, format: }
        body[:filters] = filters if filters
        @client.request(:post, "/v1/exports", body:)
      end

      # Check the status of an export job.
      def get(id)
        @client.request(:get, "/v1/exports/#{id}")
      end

      # Poll an export until it completes or fails.
      #
      # @param id [String] The export job ID.
      # @param interval [Numeric] Seconds between polls (default 1).
      # @param timeout [Numeric] Maximum seconds to wait (default 60).
      # @return [Hash] The completed or failed export.
      def poll(id, interval: 1, timeout: 60)
        deadline = Time.now + timeout
        loop do
          export = get(id)
          return export if %w[completed failed].include?(export["status"])
          raise Error.new(type: "internal_error", code: "export_timeout",
                          message: "Export did not complete within the timeout period.") if Time.now >= deadline
          sleep interval
        end
      end
    end
  end
end
