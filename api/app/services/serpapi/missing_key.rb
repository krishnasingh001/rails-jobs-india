module Serpapi
  class MissingKey < Error
    def initialize
      super("Add SERPAPI_KEY to api/.env and restart the Rails server.")
    end
  end
end
