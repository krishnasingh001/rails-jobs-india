require "test_helper"

class Api::V1::PlacesControllerTest < ActionDispatch::IntegrationTest
  test "returns a stored office address for the job" do
    job = Job.create!(
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Autodesk",
      location: "Bengaluru, Karnataka",
      last_seen_at: Time.current
    )
    CompanyPlace.create!(
      company_name: job.company_name,
      search_location: job.location,
      place_name: "Autodesk",
      address: "Prestige Technopolis, Bengaluru",
      latitude: 12.934,
      longitude: 77.611,
      maps_url: "https://www.google.com/maps/search/?api=1&query=12.934,77.611",
      found: true
    )

    get api_v1_place_path, params: { job_id: job.external_id }

    assert_response :success
    place = JSON.parse(response.body).fetch("place")
    assert_equal "Prestige Technopolis, Bengaluru", place.fetch("address")
    assert_equal "Autodesk", place.fetch("name")
    assert_in_delta 12.934, place.fetch("latitude"), 0.001
    assert place.fetch("mapsUrl").start_with?("https://www.google.com/maps/search/")
  end

  test "returns an empty place when the office was not found" do
    job = Job.create!(
      external_id: "job-2",
      title: "Rails Dev",
      company_name: "Unknown Co",
      location: "India",
      last_seen_at: Time.current
    )
    CompanyPlace.create!(
      company_name: job.company_name,
      search_location: job.location,
      found: false
    )

    get api_v1_place_path, params: { job_id: job.external_id }

    assert_response :success
    assert_nil JSON.parse(response.body).fetch("place")
  end

  test "returns not found for an unknown job" do
    get api_v1_place_path, params: { job_id: "missing" }

    assert_response :not_found
  end

  test "renders an address that has no coordinates" do
    job = Job.create!(
      external_id: "job-3",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Pune",
      last_seen_at: Time.current
    )
    CompanyPlace.create!(
      company_name: job.company_name,
      search_location: job.location,
      address: "A street in Pune",
      found: true
    )

    get api_v1_place_path, params: { job_id: job.external_id }

    assert_response :success
    place = JSON.parse(response.body).fetch("place")
    assert_nil place.fetch("latitude")
    assert_nil place.fetch("longitude")
  end

  test "returns a gateway error when the place lookup fails" do
    job = Job.create!(
      external_id: "job-4",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Pune",
      last_seen_at: Time.current
    )
    singleton = class << Serpapi::PlaceLookup; self; end
    singleton.alias_method(:call_without_stub, :call)
    singleton.define_method(:call) { |*| raise Serpapi::Error, "SerpApi could not be reached." }

    get api_v1_place_path, params: { job_id: job.external_id }

    assert_response :bad_gateway
    assert_equal "SerpApi could not be reached.", JSON.parse(response.body).fetch("error")
  ensure
    singleton.alias_method(:call, :call_without_stub) if singleton
  end
end
