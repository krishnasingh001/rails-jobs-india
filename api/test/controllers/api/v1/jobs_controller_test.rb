require "test_helper"

class Api::V1::JobsControllerTest < ActionDispatch::IntegrationTest
  test "returns stored jobs for the map" do
    Job.create!(
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Chennai, Tamil Nadu",
      apply_url: "https://jobs.example/1",
      apply_host: "jobs.example",
      posted_label: "3 days ago",
      last_seen_at: Time.current
    )
    SerpapiFetch.create!(fetched_at: Time.current, job_count: 1)

    get api_v1_jobs_path

    assert_response :success
    body = JSON.parse(response.body)
    job = body.fetch("jobs").fetch(0)

    assert_equal "job-1", job["id"]
    assert_equal "Acme", job["company"]
    assert_equal "Chennai, Tamil Nadu", job["location"]
    assert_equal "https://jobs.example/1", job["applyUrl"]
    assert_equal "jobs.example", job["applyHost"]
    assert_equal "3 days ago", job["postedAt"]
  end

  test "returns an error when the SerpApi key is missing" do
    original = ENV["SERPAPI_KEY"]
    ENV["SERPAPI_KEY"] = ""

    get api_v1_jobs_path

    assert_response :bad_gateway
    assert_equal "Add SERPAPI_KEY to api/.env and restart the Rails server.", JSON.parse(response.body)["error"]
  ensure
    ENV["SERPAPI_KEY"] = original
  end
end
