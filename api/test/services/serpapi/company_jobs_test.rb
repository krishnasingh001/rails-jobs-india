require "test_helper"

class Serpapi::CompanyJobsTest < ActiveSupport::TestCase
  test "keeps only the company's postings and falls back to a wider query" do
    client = PagedClient.new(
      "GitLab Ruby on Rails" => [ { "jobs_results" => [ { "job_id" => "r1", "company_name" => "Recruiter GitLab" } ] } ],
      "GitLab software engineer" => [
        { "jobs_results" => [ { "job_id" => "a", "company_name" => "GitLab Inc." } ], "serpapi_pagination" => { "next_page_token" => "t" } },
        { "jobs_results" => [ { "job_id" => "a", "company_name" => "GitLab Inc." }, { "job_id" => "b", "company_name" => "Gitlab" } ] }
      ]
    )

    payload = Serpapi::CompanyJobs.call("GitLab", client: client)

    assert_equal "GitLab software engineer", payload["query"]
    assert_equal %w[a b], payload["jobs"].map { |job| job["job_id"] }
    assert_equal [ nil, nil, "t" ], client.tokens
  end

  test "matches the company name as a whole word" do
    assert Serpapi::CompanyJobs.match?("G2", "G2")
    assert Serpapi::CompanyJobs.match?("Procore", "Procore Technologies")
    assert_not Serpapi::CompanyJobs.match?("G2", "G2TechSoft")
    assert_not Serpapi::CompanyJobs.match?("", "Anything")
  end

  test "treats a no results error as an empty page and re-raises others" do
    empty = Serpapi::CompanyJobs.call("MSCI", client: RaisingClient.new("Google hasn't returned any results for this query."))
    assert_empty empty["jobs"]

    assert_raises(Serpapi::Error) { Serpapi::CompanyJobs.call("MSCI", client: RaisingClient.new("Invalid API key")) }
  end

  test "merges postings into company entries without losing existing values" do
    entries = [ { "company_name" => "Cisco", "logo" => "old.png", "states" => [ "Karnataka" ], "locations" => [ "Bengaluru" ], "via_sources" => [ "LinkedIn" ], "job_ids" => [ "x" ], "job_count" => 1 } ]
    jobs = [
      { "job_id" => "y", "company_name" => "Cisco", "location" => "Pune", "via" => "LinkedIn", "thumbnail" => "new.png" },
      { "job_id" => "z", "company_name" => "MSCI", "location" => "Mumbai", "via" => "Naukri", "thumbnail" => "msci.png" }
    ]

    cisco, msci = Serpapi::CompanyJobs.merge_companies(entries, jobs)

    assert_equal [ "old.png", %w[Bengaluru Pune], %w[LinkedIn], %w[x y], 2, [ "Karnataka" ] ],
      cisco.values_at("logo", "locations", "via_sources", "job_ids", "job_count", "states")
    assert_equal [ "msci.png", 1 ], msci.values_at("logo", "job_count")
  end

  class PagedClient
    attr_reader :tokens

    def initialize(pages)
      @pages = pages.transform_values(&:dup)
      @tokens = []
    end

    def google_jobs(query:, location:, next_page_token: nil)
      @tokens << next_page_token
      @pages.fetch(query).shift || {}
    end
  end

  class RaisingClient
    def initialize(message)
      @message = message
    end

    def google_jobs(**)
      raise Serpapi::Error, @message
    end
  end
end
