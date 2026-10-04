require "test_helper"

class Serpapi::PlaceLookupTest < ActiveSupport::TestCase
  class FakeClient
    attr_reader :api_key, :calls, :ll

    def initialize(payload:, api_key: "test-key")
      @payload = payload
      @api_key = api_key
      @calls = 0
    end

    def google_maps(query:, ll:)
      @calls += 1
      @ll = ll
      @payload
    end
  end

  setup do
    @job = Job.create!(
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Autodesk",
      location: "Bengaluru, Karnataka",
      last_seen_at: Time.current
    )
  end

  test "stores the office address and reuses it" do
    client = FakeClient.new(
      payload: {
        "local_results" => [
          {
            "title" => "Some Other Office",
            "address" => "1 Other Road, Bengaluru"
          },
          {
            "title" => "Autodesk",
            "address" => "Prestige Technopolis, Bengaluru, Karnataka 560037",
            "gps_coordinates" => { "latitude" => 12.934, "longitude" => 77.611 }
          }
        ]
      }
    )

    place = Serpapi::PlaceLookup.call(@job, client: client)

    assert place.found?
    assert_equal "Autodesk", place.place_name
    assert_equal "Prestige Technopolis, Bengaluru, Karnataka 560037", place.address
    assert_in_delta 12.934, place.latitude.to_f, 0.001
    assert_includes place.maps_url, "query="
    assert_includes client.ll, "12.9716"

    Serpapi::PlaceLookup.call(@job, client: client)

    assert_equal 1, client.calls
    assert_equal 1, CompanyPlace.count
  end

  test "remembers when Google Maps has no office" do
    client = FakeClient.new(payload: { "local_results" => [] })

    place = Serpapi::PlaceLookup.call(@job, client: client)

    assert_not place.found?
    assert_nil Serpapi::PlaceLookup.call(@job, client: client).address
    assert_equal 1, client.calls
  end
end
