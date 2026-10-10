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

  test "never calls SerpApi while serving jobs" do
    singleton = class << Serpapi::Harvest; self; end
    original = Serpapi::Harvest.method(:call)
    singleton.define_method(:call) { |*, **| flunk "request triggered a harvest" }

    get api_v1_jobs_path

    assert_response :success
    assert_equal [], JSON.parse(response.body).fetch("jobs")
  ensure
    singleton&.define_method(:call) { |*args, **kwargs, &block| original.call(*args, **kwargs, &block) }
  end
end
