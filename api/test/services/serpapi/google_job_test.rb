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

  test "marks a posting remote from Google's work-from-home flag" do
    assert_equal [ true, "google_work_from_home" ], Serpapi::GoogleJob.remote_signal({ "detected_extensions" => { "work_from_home" => true } }, "Pune")
  end

  test "marks a posting remote from its extensions or location" do
    assert_equal [ true, "extensions" ], Serpapi::GoogleJob.remote_signal({ "extensions" => [ "Full-time", "Work from home" ] }, "Anywhere")
    assert_equal [ true, "location" ], Serpapi::GoogleJob.remote_signal({}, "Remote, India")
  end

  test "a posting with no remote signal is not remote" do
    assert_equal [ false, nil ], Serpapi::GoogleJob.remote_signal({ "extensions" => [ "Full-time" ] }, "Pune, Maharashtra")
    assert_equal [ false, nil ], Serpapi::GoogleJob.remote_signal(nil, nil)
  end

  test "stores the remote flag on the job attributes" do
    listing = Serpapi::GoogleJob.new(
      { "job_id" => "job-3", "location" => "Anywhere", "extensions" => [ "Work from home" ] },
      query: "Ruby on Rails",
      search_location: "India"
    )

    assert_equal true, listing.attributes[:remote]
    assert_equal "extensions", listing.attributes[:remote_source]
  end

  test "ignores an apply option that is not a link" do
    missing = Serpapi::GoogleJob.new(
      { "job_id" => "job-4", "apply_options" => [ "Apply", { "link" => "" } ] },
      query: "Ruby on Rails",
      search_location: "India"
    )
    number = Serpapi::GoogleJob.new(
      { "job_id" => "job-4b", "apply_options" => [ { "link" => 12 } ] },
      query: "Ruby on Rails",
      search_location: "India"
    )

    assert_nil missing.attributes[:apply_url]
    assert_nil number.attributes[:apply_url]
  end

  test "drops a link that has no host or is not a valid url" do
    relative = Serpapi::GoogleJob.new(
      { "job_id" => "job-5", "apply_options" => [ { "link" => "/jobs/1" } ] },
      query: "Ruby on Rails",
      search_location: "India"
    )
    broken = Serpapi::GoogleJob.new(
      { "job_id" => "job-6", "apply_options" => [ { "link" => "https://exa mple.com/jobs/1" } ] },
      query: "Ruby on Rails",
      search_location: "India"
    )

    assert_equal "/jobs/1", relative.attributes[:apply_url]
    assert_nil relative.attributes[:apply_host]
    assert_nil broken.attributes[:apply_host]
  end
end
