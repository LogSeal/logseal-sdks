# frozen_string_literal: true

module LogSeal
  module Resources
    class Schemas
      def initialize(client)
        @client = client
      end

      def list
        @client.request(:get, "/v1/schemas")
      end

      def create(action:, description: nil, target_types: nil, metadata_schema: nil)
        body = { action: }
        body[:description] = description if description
        body[:target_types] = target_types if target_types
        body[:metadata_schema] = metadata_schema if metadata_schema
        @client.request(:post, "/v1/schemas", body:)
      end

      def get(id)
        @client.request(:get, "/v1/schemas/#{id}")
      end

      def update(id, **fields)
        @client.request(:patch, "/v1/schemas/#{id}", body: fields)
      end

      def delete(id)
        @client.request(:delete, "/v1/schemas/#{id}")
      end
    end
  end
end
