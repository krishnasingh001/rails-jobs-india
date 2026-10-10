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

  test "builds a maps link from the address when there is no pin" do
    client = FakeClient.new(
      payload: {
        "local_results" => [
          { "title" => "Autodesk", "address" => "Street only, Bengaluru" }
        ]
      }
    )

    place = Serpapi::PlaceLookup.call(@job, client: client)

    assert place.found?
    assert_nil place.latitude
    assert_includes place.maps_url, "Street+only"
  end

  test "centers an unknown city and prefers a place result" do
    @job.update!(location: "Atlantis")
    client = FakeClient.new(
      payload: {
        "place_results" => {
          "title" => "Autodesk HQ",
          "address" => "1 Main, Atlantis",
          "gps_coordinates" => { "latitude" => 1.5, "longitude" => 2.5 }
        },
        "local_results" => [
          { "title" => "", "address" => { "street" => "not text" } },
          "not a hash"
        ]
      }
    )

    place = Serpapi::PlaceLookup.call(@job, client: client)

    assert_equal "Autodesk HQ", place.place_name
    assert_includes client.ll, "22.5"
    lookup = Serpapi::PlaceLookup.new(Job.new(company_name: "", location: "Atlantis"), client: client)
    assert_equal false, lookup.send(:title_matches?, { "title" => "Autodesk" })
  end

  test "refuses to search without an API key" do
    error = assert_raises(Serpapi::MissingKey) do
      Serpapi::PlaceLookup.call(@job, client: FakeClient.new(payload: {}, api_key: ""))
    end

    assert_match(/SERPAPI_KEY/, error.message)
  end
end
