# frozen_string_literal: true

module LogSeal
  # Raised when the LogSeal API returns an error response.
  #
  #   begin
  #     client.events.get("bad_id")
  #   rescue LogSeal::Error => e
  #     puts e.type        # => "not_found_error"
  #     puts e.code        # => "event_not_found"
  #     puts e.message     # => "Event not found"
  #     puts e.status_code # => 404
  #   end
  class Error < StandardError
    attr_reader :type, :code, :param, :doc_url, :status_code

    def initialize(type:, code:, message:, param: nil, doc_url: nil, status_code: 400)
      super(message)
      @type = type
      @code = code
      @param = param
      @doc_url = doc_url
      @status_code = status_code
    end

    def to_s
      "[#{type}] #{code}: #{message}"
    end
  end
end
