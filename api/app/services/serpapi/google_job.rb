require "uri"

module Serpapi
  class GoogleJob
    def initialize(result, query:, search_location:)
      @result = result
      @query = query
      @search_location = search_location
    end

    def external_id
      result["job_id"].to_s.presence
    end

    def attributes
      {
        external_id: external_id,
        title: result["title"].presence || "Rails role",
        company_name: result["company_name"].presence || "Company",
        location: result["location"].to_s,
        salary: salary,
        apply_url: apply_link,
        apply_host: host_of(apply_link),
        posted_label: posted_label,
        description: result["description"].to_s,
        via: result["via"].presence,
        query: query,
        search_location: search_location,
        raw: result,
        last_seen_at: Time.current
      }
    end

    private

    attr_reader :result, :query, :search_location

    def salary
      detected = result.dig("detected_extensions", "salary")
      return detected if detected.is_a?(String) && detected.present?

      extension_matching?(/[₹$]|rs\.?|lakh|\ba year\b|\ban hour\b|\bper (year|month|hour)\b/i)
    end

    def apply_link
      options = result["apply_options"]
      return unless options.is_a?(Array)

      link = options.find { |option| option.is_a?(Hash) && option["link"].present? }&.dig("link")
      link if link.is_a?(String)
    end

    def posted_label
      detected = result.dig("detected_extensions", "posted_at")
      return detected if detected.is_a?(String) && detected.present?

      extension_matching?(/\bago\b|\bposted\b/i).to_s
    end

    def extension_matching?(pattern)
      extensions.find { |item| item.is_a?(String) && item.match?(pattern) }
    end

    def extensions
      Array(result["extensions"])
    end

    def host_of(url)
      return if url.blank?

      URI.parse(url).host&.delete_prefix("www.")
    rescue URI::InvalidURIError
      nil
    end
  end
end
