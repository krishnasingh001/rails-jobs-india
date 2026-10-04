require "test_helper"

class Serpapi::GoogleJobTest < ActiveSupport::TestCase
  test "reads pay from the extensions when Google did not detect a salary" do
    listing = Serpapi::GoogleJob.new(
      {
        "job_id" => "job-1",
        "title" => "Rails Dev",
        "company_name" => "Acme",
        "location" => "Bengaluru, Karnataka",
        "extensions" => [ "₹3L–₹25L a year", "Full-time" ]
      },
      query: "Ruby on Rails",
      search_location: "India"
    )

    assert_equal "₹3L–₹25L a year", listing.attributes[:salary]
    assert_equal "", listing.attributes[:posted_label]
  end

  test "keeps a relative posted date separate from pay" do
    listing = Serpapi::GoogleJob.new(
      {
        "job_id" => "job-2",
        "extensions" => [ "Full-time", "3 days ago" ],
        "detected_extensions" => { "salary" => "₹18L a year", "posted_at" => "3 days ago" }
      },
      query: "Ruby on Rails",
      search_location: "India"
    )

    assert_equal "₹18L a year", listing.attributes[:salary]
    assert_equal "3 days ago", listing.attributes[:posted_label]
  end
end
