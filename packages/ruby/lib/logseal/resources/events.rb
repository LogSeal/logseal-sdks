# frozen_string_literal: true

module LogSeal
  module Resources
    class Events
      def initialize(client)
        @client = client
      end

      # List events with filtering and pagination.
      #
      #   page = client.events.list(organization_id: "org_acme", action: "user.login", limit: 50)
      #   page["data"].each { |e| puts e["action"] }
      def list(organization_id:, action: nil, action_prefix: nil, actor_id: nil,
               target_type: nil, target_id: nil, after: nil, before: nil,
               search: nil, limit: nil, cursor: nil)
        params = { organization_id: }.compact
        params[:action] = action if action
        params[:action_prefix] = action_prefix if action_prefix
        params[:actor_id] = actor_id if actor_id
        params[:target_type] = target_type if target_type
        params[:target_id] = target_id if target_id
        params[:after] = after if after
        params[:before] = before if before
        params[:search] = search if search
        params[:limit] = limit if limit
        params[:cursor] = cursor if cursor

        @client.request(:get, "/v1/events", params:)
      end

      # Retrieve a single event by ID.
      def get(event_id)
        @client.request(:get, "/v1/events/#{event_id}")
      end

      # Verify hash-chain integrity.
      def verify(organization_id:, after: nil, before: nil)
        body = { organization_id: }
        body[:after] = after if after
        body[:before] = before if before
        @client.request(:post, "/v1/events/verify", body:)
      end

      # Verify a specific sequence range.
      def verify_range(organization_id:, from_sequence:, to_sequence:)
        @client.request(:post, "/v1/events/verify-range", body: {
          organization_id:, from_sequence:, to_sequence:
        })
      end

      # Retrieve the Merkle proof for an event.
      def get_proof(event_id)
        @client.request(:get, "/v1/events/#{event_id}/proof")
      end

      # Auto-paginate through all matching events.
      #
      #   client.events.list_all(organization_id: "org_acme") do |event|
      #     puts "#{event['action']} by #{event.dig('actor', 'name')}"
      #   end
      #
      # @return [Enumerator] if no block is given.
      def list_all(**params, &block)
        return enum_for(:list_all, **params) unless block

        cursor = nil
        loop do
          page = list(**params, cursor:)
          page["data"].each(&block)
          cursor = page["next_cursor"]
          break unless page["has_more"] && cursor
        end
      end
    end
  end
end
