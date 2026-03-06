# frozen_string_literal: true

module LogSeal
  module Resources
    class ViewerTokens
      def initialize(client)
        @client = client
      end

      # Create a short-lived viewer token for the embeddable log viewer.
      def create(organization_id:, expires_in: nil)
        body = { organization_id: }
        body[:expires_in] = expires_in if expires_in
        @client.request(:post, "/v1/viewer-tokens", body:)
      end
    end
  end
end
