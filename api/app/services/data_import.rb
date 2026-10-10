# Loads the JSON files in api/data (the source of truth) into the database.
# Idempotent: safe to run repeatedly.
class DataImport
  DATA_DIR = Rails.root.join("data")

  def self.call
    new.call
  end

  def call
    {
      jobs: import_jobs,
      companies: import_companies,
      company_insights: import_company_insights,
      company_profiles: import_company_profiles
    }
  end

  private

  def read(path)
    JSON.parse(File.read(DATA_DIR.join(path)))
  end

  def import_jobs
    imported = 0
    Dir[DATA_DIR.join("jobs/*.json")].sort.each do |file|
      next if File.basename(file) == "manifest.json"

      payload = JSON.parse(File.read(file))
      fetched_at = Time.zone.parse(payload["fetched_at"].to_s) || Time.current
      Array(payload["jobs"]).each do |result|
        listing = Serpapi::GoogleJob.new(result, query: payload["query"], search_location: payload["location"])
        next if listing.external_id.blank?

        job = Job.find_or_initialize_by(external_id: listing.external_id)
        job.assign_attributes(listing.attributes.merge(last_seen_at: job.last_seen_at || fetched_at)) if job.new_record?
        job.state = payload["state"]
        job.save!
        imported += 1
      end
    end
    imported
  end

  def import_companies
    read("companies/companies.json").each do |entry|
      logo = DATA_DIR.join("logos", entry["logo_file"].to_s) if entry["logo_file"].present?
      Company.find_or_initialize_by(company_name: entry["company_name"]).update!(
        logo: entry["logo"],
        logo_data: logo&.binread,
        logo_content_type: logo && Rack::Mime.mime_type(logo.extname),
        job_count: entry["job_count"].to_i,
        states: entry["states"] || [],
        locations: entry["locations"] || [],
        via_sources: entry["via_sources"] || [],
        job_ids: entry["job_ids"] || []
      )
    end.size
  end

  def import_company_insights
    Dir[DATA_DIR.join("company_insights/*.json")].sort.sum do |file|
      entry = JSON.parse(File.read(file))
      CompanyInsight.find_or_initialize_by(company_name: entry["company_name"]).update!(
        query: entry["query"],
        fetched_at: entry["fetched_at"],
        markdown: entry["markdown"],
        references: entry["references"] || [],
        text_blocks: entry["text_blocks"] || [],
        related_questions: entry["related_questions"] || []
      )
      1
    end
  end

  def import_company_profiles
    Dir[DATA_DIR.join("company_profiles/*.json")].sort.sum do |file|
      entry = JSON.parse(File.read(file))
      insight = CompanyInsight.find_or_initialize_by(company_name: entry["company_name"])
      profile = entry["profile"] || {}
      insight.update!(
        profile: profile,
        domain_area: profile["domain_area"],
        profile_references: entry["references"] || [],
        profile_fetched_at: entry["fetched_at"]
      )
      1
    end
  end
end
