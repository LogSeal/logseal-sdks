# frozen_string_literal: true

module LogSeal
  module Resources
    class Organizations
      def initialize(client)
        @client = client
      end

      # List all organizations.
      def list
        @client.request(:get, "/v1/organizations")
      end

      # Create a new organization.
      def create(external_id:, name: nil)
        body = { external_id: }
        body[:name] = name if name
        @client.request(:post, "/v1/organizations", body:)
      end

      # Retrieve an organization by ID.
      def get(id)
        @client.request(:get, "/v1/organizations/#{id}")
      end
    end
  end
end
