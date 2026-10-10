module Serpapi
  # Fetches Google Jobs postings for one company. Returns a payload in the
  # same shape as the files in data/jobs, so DataImport can load it.
  class CompanyJobs
    LOCATION = "India".freeze
    MAX_PAGES = 2

    def self.call(company, client: nil)
      new(company, client: client).call
    end

    # Google also returns recruiters that name the company in the posting.
    # Keep a posting only when its company name starts with the target name
    # as a whole word, so "G2" keeps "G2" but not "G2TechSoft".
    def self.match?(company, posting_company)
      company.present? && posting_company.to_s.match?(/\A#{Regexp.escape(company)}\b/i)
    end

    # Merges postings into the entries of data/companies/companies.json.
    # Existing values stay; new locations, sources and job ids are added.
    def self.merge_companies(entries, jobs)
      by_name = entries.index_by { |entry| entry["company_name"] }
      jobs.group_by { |job| job["company_name"] }.each do |name, postings|
        entry = by_name[name] ||= { "company_name" => name, "logo" => nil, "states" => [], "locations" => [], "via_sources" => [], "job_ids" => [] }
        entry["logo"] ||= postings.filter_map { |job| job["thumbnail"].presence }.first
        entry["locations"] = (Array(entry["locations"]) + postings.map { |job| job["location"] }).compact_blank.uniq
        entry["via_sources"] = (Array(entry["via_sources"]) + postings.map { |job| job["via"] }).compact_blank.uniq
        entry["job_ids"] = (Array(entry["job_ids"]) + postings.map { |job| job["job_id"] }).compact_blank.uniq
        entry["job_count"] = entry["job_ids"].size
      end
      by_name.values
    end

    def initialize(company, client: nil)
      @company = company
      @client = client || Client.new
    end

    def call
      [ "#{company} Ruby on Rails", "#{company} software engineer" ].each do |query|
        jobs = fetch(query)
        return payload(query, jobs) if jobs.any?
      end
      payload("#{company} software engineer", [])
    end

    private

    attr_reader :company, :client

    def fetch(query)
      jobs = []
      token = nil
      MAX_PAGES.times do
        page = client.google_jobs(query: query, location: LOCATION, next_page_token: token)
        jobs.concat(Array(page["jobs_results"]).select { |job| self.class.match?(company, job["company_name"]) })
        token = page.dig("serpapi_pagination", "next_page_token")
        break unless token.is_a?(String) && token.present?
      end
      jobs.uniq { |job| job["job_id"] }
    rescue Error => error
      raise unless error.message.match?(/hasn't returned any results/i)

      jobs
    end

    def payload(query, jobs)
      {
        "state" => nil,
        "company" => company,
        "query" => query,
        "location" => LOCATION,
        "fetched_at" => Time.current.utc.iso8601,
        "total_fetched" => jobs.size,
        "jobs" => jobs
      }
    end
  end
end
