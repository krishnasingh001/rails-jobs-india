module Serpapi
  class Harvest
    Result = Struct.new(:jobs, :added, keyword_init: true) do
      def size
        jobs.size
      end

      def first
        jobs.first
      end
    end

    QUERIES = [
      { query: "Ruby on Rails", location: "India" },
      { query: "Ruby on Rails developer", location: "Bengaluru, Karnataka, India" }
    ].freeze

    FRESH_FOR = 6.hours
    MAX_PAGES = 2

    def self.call(force: false, client: nil)
      new(client: client).call(force: force)
    end

    def initialize(client: nil)
      @client = client || Client.new
    end

    def call(force: false)
      return Result.new(jobs: Job.recent, added: 0) unless force || stale?

      raise MissingKey if client.api_key.blank?

      added = QUERIES.sum { |search| import_search(search) }
      SerpapiFetch.create!(fetched_at: Time.current, job_count: Job.count)
      Result.new(jobs: Job.recent, added: added)
    end

    private

    attr_reader :client

    def import_search(search)
      cursor = SearchCursor.find_or_initialize_by(query: search[:query], location: search[:location])
      token = cursor.next_page_token
      added = 0

      MAX_PAGES.times do
        payload = client.google_jobs(query: search[:query], location: search[:location], next_page_token: token)
        page_added = store_page(payload, search)
        added += page_added
        token = next_page_token(payload)
        cursor.update!(next_page_token: token)
        break if page_added.positive? || token.blank?
      end

      added
    end

    def store_page(payload, search)
      added = 0
      Array(payload["jobs_results"]).each do |result|
        listing = GoogleJob.new(result, query: search[:query], search_location: search[:location])
        next if listing.external_id.blank?

        job = Job.find_or_initialize_by(external_id: listing.external_id)
        added += 1 if job.new_record?
        job.update!(listing.attributes)
      end
      added
    end

    def next_page_token(payload)
      token = payload.dig("serpapi_pagination", "next_page_token")
      token = payload.dig("pagination", "next_page_token") unless token.is_a?(String)
      token.is_a?(String) ? token.presence : nil
    end

    def stale?
      fetched_at = SerpapiFetch.maximum(:fetched_at)
      fetched_at.blank? || fetched_at <= FRESH_FOR.ago
    end
  end
end
