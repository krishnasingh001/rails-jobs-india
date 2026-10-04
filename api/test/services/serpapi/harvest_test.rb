require "test_helper"

class Serpapi::HarvestTest < ActiveSupport::TestCase
  class FakeClient
    attr_reader :api_key, :calls, :searches

    def initialize(api_key: "test-key")
      @api_key = api_key
      @calls = 0
      @searches = []
    end

    def google_jobs(query:, location:, next_page_token: nil)
      @calls += 1
      @searches << [ query, location, next_page_token ]
      {
        "jobs_results" => [
          {
            "job_id" => "job-1",
            "title" => "Rails Dev",
            "company_name" => "Acme",
            "location" => "Indore, Madhya Pradesh",
            "apply_options" => [ { "title" => "Apply", "link" => "https://www.acme.example/apply" } ],
            "detected_extensions" => { "posted_at" => "2 days ago", "salary" => "₹10L a year" }
          },
          {
            "job_id" => "",
            "title" => "Missing id"
          }
        ]
      }
    end
  end

  test "stores listings once and skips SerpApi while the fetch is fresh" do
    client = FakeClient.new

    jobs = Serpapi::Harvest.call(client: client)

    assert_equal 1, jobs.size
    assert_equal 2, client.calls
    assert_equal [ "Ruby on Rails", "India", nil ], client.searches.first
    assert_equal "acme.example", jobs.first.apply_host
    assert_equal "₹10L a year", jobs.first.salary
    assert_equal "Indore, Madhya Pradesh", jobs.first.location

    Serpapi::Harvest.call(client: client)

    assert_equal 2, client.calls
    assert_equal 1, Job.count
    assert_equal 1, SerpapiFetch.count
  end

  class PagingClient
    attr_reader :api_key, :tokens

    def initialize
      @api_key = "test-key"
      @tokens = []
    end

    def google_jobs(query:, location:, next_page_token: nil)
      @tokens << next_page_token
      page = next_page_token.present? ? "2" : "1"
      {
        "jobs_results" => [
          {
            "job_id" => "#{query}-#{page}",
            "title" => "Rails Dev",
            "company_name" => "Acme",
            "location" => location
          }
        ],
        "serpapi_pagination" => { "next_page_token" => "#{query}-#{page.to_i + 1}" }
      }
    end
  end

  test "reads the next page when the current page is already stored" do
    client = PagingClient.new

    first = Serpapi::Harvest.call(client: client)

    assert_equal 2, first.added
    assert_equal 2, Job.count

    second = Serpapi::Harvest.call(force: true, client: client)

    assert_equal 2, second.added
    assert_equal 4, Job.count
    assert_includes client.tokens, "Ruby on Rails-2"
  end

  test "refuses to search without an API key" do
    error = assert_raises(Serpapi::MissingKey) do
      Serpapi::Harvest.call(client: FakeClient.new(api_key: ""))
    end

    assert_equal "Add SERPAPI_KEY to api/.env and restart the Rails server.", error.message
    assert_equal 0, Job.count
  end
end
