class CompanyInsightBlueprint < Blueprinter::Base
  field :company_name, name: :companyName
  field :domain_area, name: :domainArea
  field(:fetchedAt) { |insight| insight.profile_fetched_at&.utc&.iso8601 }

  field(:layoffs) { |insight| text(insight.profile["layoffs_last_year"]) }
  field(:headCount) { |insight| text(insight.profile["head_count"]) }
  field(:values) { |insight| text(insight.profile["values"]) }
  field(:foundedYear) { |insight| insight.profile["founded_year"].presence&.to_i }
  field(:offices) do |insight|
    Array(insight.profile["office_locations"]).map { |office| text(office) }.compact
  end
  field(:sources) do |insight|
    Array(insight.profile_references).filter_map do |reference|
      link = reference["link"].to_s
      next unless link.start_with?("http")

      { title: reference["title"].presence || link, link: link, icon: reference["source_icon"].presence }
    end
  end

  def self.text(value)
    value.to_s.strip.presence
  end
end
