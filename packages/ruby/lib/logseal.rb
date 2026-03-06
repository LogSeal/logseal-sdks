# frozen_string_literal: true

require_relative "logseal/version"
require_relative "logseal/error"
require_relative "logseal/client"
require_relative "logseal/resources/events"
require_relative "logseal/resources/organizations"
require_relative "logseal/resources/schemas"
require_relative "logseal/resources/viewer_tokens"
require_relative "logseal/resources/webhooks"
require_relative "logseal/resources/exports"

module LogSeal
  class << self
    # Convenience constructor.
    #
    #   client = LogSeal.new(api_key: "sk_test_...")
    def new(**kwargs)
      Client.new(**kwargs)
    end
  end
end
