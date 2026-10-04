module Serpapi
  # Asks Brave AI Mode for a fixed JSON profile of a company and returns it
  # alongside the raw answer and references as evidence.
  class CompanyProfile
    ATTEMPTS = 2

    PROMPT = <<~TEXT.squish
      %<name>s: layoffs in the last 12 months (date, employees affected, percent of workforce),
      total head count with date, office locations, company values, year founded,
      and domain area (a one or two sentence explanation of what the company does and which industry it serves).
      Reply as JSON only with keys layoffs_last_year, head_count, office_locations, values, founded_year, domain_area.
    TEXT

    def self.call(company_name, client: nil)
      new(company_name, client: client).call
    end

    def initialize(company_name, client: nil)
      @company_name = company_name
      @client = client || Client.new
    end

    def call
      query = format(PROMPT, name: company_name)
      last_error = nil

      ATTEMPTS.times do
        raw = client.brave_ai_mode(query: query)
        profile = parse(raw["markdown"])
        return {
          company_name: company_name,
          query: query,
          fetched_at: Time.current.utc.iso8601,
          profile: profile,
          raw_markdown: raw["markdown"],
          references: raw["references"]
        }
      rescue JSON::ParserError => e
        last_error = e
      end

      raise Error, "Brave AI Mode did not return valid JSON for #{company_name}: #{last_error.message}"
    end

    private

    attr_reader :company_name, :client

    def parse(markdown)
      text = markdown.to_s.strip.sub(/\A```(?:json)?\s*/, "").sub(/\s*```\z/, "")
      JSON.parse(text[/\{.*\}/m] || text)
    end
  end
end
