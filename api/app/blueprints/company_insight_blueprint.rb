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
    case value
    when Array
      value.filter_map { |item| text(item) }.join("\n").presence
    when Hash
      hash_text(value)
    else
      value.to_s.strip.presence
    end
  end

  def self.hash_text(value)
    date = value["date"].to_s.strip.presence
    affected = value["employees_affected"].to_s.strip.presence
    percent = value["percent_of_workforce"].to_s.strip.presence
    note = value["note"].to_s.strip.presence
    count = (value["total"] || value["count"]).to_s.strip.presence
    as_of = value["as_of"].to_s.strip.presence

    if date || affected || percent || note
      line = [ date, affected && "#{affected} people", percent ].compact.join(" · ")
      [ line.presence, note ].compact.join("\n")
    elsif count || as_of
      [ count, as_of && "as of #{as_of}" ].compact.join(", ")
    else
      value.values.filter_map { |item| text(item) }.join("\n").presence
    end
  end
  private_class_method :hash_text
end
