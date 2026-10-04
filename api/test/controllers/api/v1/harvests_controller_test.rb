require "test_helper"

class Api::V1::HarvestsControllerTest < ActionDispatch::IntegrationTest
  test "forces a harvest and returns the jobs for the map" do
    Job.create!(
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Bengaluru, Karnataka",
      last_seen_at: Time.current
    )
    forced = false
    singleton = class << Serpapi::Harvest; self; end
    original = Serpapi::Harvest.method(:call)
    singleton.define_method(:call) do |force: false, **|
      forced = force
      Serpapi::Harvest::Result.new(jobs: Job.recent, added: 4)
    end

    post api_v1_harvests_path

    assert_response :success
    assert forced
    body = JSON.parse(response.body)
    assert_equal "job-1", body.fetch("jobs").fetch(0).fetch("id")
    assert_equal "Acme", body.fetch("jobs").fetch(0).fetch("company")
    assert_equal 4, body.fetch("added")
  ensure
    singleton&.define_method(:call) do |*args, **kwargs, &block|
      original.call(*args, **kwargs, &block)
    end
  end

  test "returns the SerpApi error when a forced harvest cannot run" do
    original = ENV["SERPAPI_KEY"]
    ENV["SERPAPI_KEY"] = ""

    post api_v1_harvests_path

    assert_response :bad_gateway
    assert_equal "Add SERPAPI_KEY to api/.env and restart the Rails server.", JSON.parse(response.body)["error"]
  ensure
    ENV["SERPAPI_KEY"] = original
  end
end
