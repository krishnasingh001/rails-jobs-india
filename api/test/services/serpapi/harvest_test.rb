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

  class EmptyPageClient
    attr_reader :api_key, :tokens

    def initialize
      @api_key = "test-key"
      @tokens = []
    end

    def google_jobs(query:, location:, next_page_token: nil)
      @tokens << next_page_token
      if next_page_token.present?
        raise Serpapi::Error, "Google hasn't returned any results for this query."
      end

      {
        "jobs_results" => [
          {
            "job_id" => "fresh-1",
            "title" => "Rails Dev",
            "company_name" => "Acme",
            "location" => location
          }
        ]
      }
    end
  end

  test "drops an expired next page and loads the first page of results" do
    SearchCursor.create!(query: "Ruby on Rails", location: "India", next_page_token: "stale-token")
    SearchCursor.create!(
      query: "Ruby on Rails developer",
      location: "Bengaluru, Karnataka, India",
      next_page_token: "stale-token"
    )
    client = EmptyPageClient.new

    result = Serpapi::Harvest.call(force: true, client: client)

    assert_equal 1, result.added
    assert_includes client.tokens, nil
    assert_nil SearchCursor.find_by!(query: "Ruby on Rails", location: "India").next_page_token
  end

  class NoResultsClient
    attr_reader :api_key

    def initialize
      @api_key = "test-key"
    end

    def google_jobs(query:, location:, next_page_token: nil)
      raise Serpapi::Error, "Google hasn't returned any results for this query."
    end
  end

  test "keeps stored jobs when Google returns no results" do
    Job.create!(
      external_id: "stored-1",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Chennai, Tamil Nadu",
      last_seen_at: Time.current
    )

    result = Serpapi::Harvest.call(force: true, client: NoResultsClient.new)

    assert_equal 0, result.added
    assert_equal [ "stored-1" ], result.jobs.map(&:external_id)
  end

  class DuplicatePageClient
    attr_reader :api_key

    def initialize
      @api_key = "test-key"
    end

    def google_jobs(query:, location:, next_page_token: nil)
      if next_page_token.nil?
        {
          "jobs_results" => [
            { "job_id" => "already-there", "title" => "Rails Dev", "company_name" => "Acme", "location" => location }
          ],
          "serpapi_pagination" => { "next_page_token" => "more-#{query}" }
        }
      else
        {
          "jobs_results" => [
            { "job_id" => "new-#{query}", "title" => "Rails Dev", "company_name" => "Acme", "location" => location }
          ]
        }
      end
    end
  end

  test "keeps paging when a page only contains listings we already stored" do
    Job.create!(
      external_id: "already-there",
      title: "Rails Dev",
      company_name: "Acme",
      location: "India",
      last_seen_at: Time.current
    )

    result = Serpapi::Harvest.call(force: true, client: DuplicatePageClient.new)

    assert_equal 2, result.added
    assert Job.exists?(external_id: "new-Ruby on Rails")
  end

  class BrokenClient
    attr_reader :api_key

    def initialize
      @api_key = "test-key"
    end

    def google_jobs(*)
      raise Serpapi::Error, "SerpApi could not be reached."
    end
  end

  test "raises when SerpApi fails for a reason other than no results" do
    assert_raises(Serpapi::Error) do
      Serpapi::Harvest.call(force: true, client: BrokenClient.new)
    end
  end

  test "refuses to search without an API key" do
    error = assert_raises(Serpapi::MissingKey) do
      Serpapi::Harvest.call(client: FakeClient.new(api_key: ""))
    end

    assert_equal "Add SERPAPI_KEY to api/.env and restart the Rails server.", error.message
    assert_equal 0, Job.count
  end
end
