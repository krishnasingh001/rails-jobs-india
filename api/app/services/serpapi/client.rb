require "json"
require "net/http"
require "uri"

module Serpapi
  class Client
    ENDPOINT = "https://serpapi.com/search.json"

    attr_reader :api_key

    def initialize(api_key: ENV["SERPAPI_KEY"])
      @api_key = api_key.to_s
    end

    def google_jobs(query:, location:, next_page_token: nil)
      params = {
        engine: "google_jobs",
        q: query,
        location: location,
        gl: "in",
        hl: "en",
        api_key: api_key
      }
      params[:next_page_token] = next_page_token if next_page_token.present?
      get(params)
    end

    def google_maps(query:, ll:)
      get(
        engine: "google_maps",
        type: "search",
        q: query,
        ll: ll,
        hl: "en",
        gl: "in",
        api_key: api_key
      )
    end

    private

    def get(params)
      uri = URI(ENDPOINT)
      uri.query = URI.encode_www_form(params)
      response = Net::HTTP.get_response(uri)
      body = JSON.parse(response.body)
      raise Error, "SerpApi returned a response that was not JSON." unless body.is_a?(Hash)

      if !response.is_a?(Net::HTTPSuccess) || body["error"].present?
        message = body["error"].is_a?(String) ? body["error"] : "SerpApi could not return Google Jobs."
        raise Error, message
      end

      body
    rescue JSON::ParserError
      raise Error, "SerpApi returned a response that was not JSON."
    rescue SocketError, Timeout::Error, Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout
      raise Error, "SerpApi could not be reached."
    end
  end
end
