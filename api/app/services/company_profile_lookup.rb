# Company profiles are stored as JSON under data/company_profiles.
# Those files win. A database row is used only when no file matches.
class CompanyProfileLookup
  DIR = Rails.root.join("data/company_profiles")

  def self.find(name)
    key = name.to_s.strip.downcase
    return if key.blank?

    from_files(key) || CompanyInsight.where.not(profile: {}).find_by("lower(company_name) = ?", key)
  end

  def self.from_files(key)
    return unless DIR.exist?

    Dir[DIR.join("*.json")].sort.each do |file|
      insight = read_file(file, key)
      return insight if insight
    end
    nil
  end

  def self.read_file(file, key)
    entry = JSON.parse(File.read(file))
    return unless entry.is_a?(Hash)

    company = entry["company_name"].to_s.strip
    profile = entry["profile"]
    return if company.blank? || company.downcase != key || !profile.is_a?(Hash) || profile.blank?

    CompanyInsight.new(
      company_name: company,
      profile: profile,
      domain_area: profile["domain_area"],
      profile_references: entry["references"].is_a?(Array) ? entry["references"] : [],
      profile_fetched_at: Time.zone.parse(entry["fetched_at"].to_s)
    )
  rescue JSON::ParserError
    nil
  end
  private_class_method :from_files, :read_file
end
