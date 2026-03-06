# frozen_string_literal: true

module LogSeal
  module Resources
    class Webhooks
      def initialize(client)
        @client = client
      end

      def list
        @client.request(:get, "/v1/webhooks")
      end

      # Create a new webhook. The signing +secret+ is only returned once.
      def create(url:, organization_id: nil, events: nil, enabled: nil)
        body = { url: }
        body[:organization_id] = organization_id if organization_id
        body[:events] = events if events
        body[:enabled] = enabled unless enabled.nil?
        @client.request(:post, "/v1/webhooks", body:)
      end

      def get(id)
        @client.request(:get, "/v1/webhooks/#{id}")
      end

      def update(id, **fields)
        @client.request(:patch, "/v1/webhooks/#{id}", body: fields)
      end

      def delete(id)
        @client.request(:delete, "/v1/webhooks/#{id}")
      end
    end
  end
end
