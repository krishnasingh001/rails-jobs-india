require "test_helper"

class JobBlueprintTest < ActiveSupport::TestCase
  test "renders the fields the map already reads" do
    job = Job.new(
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Acme",
      location: "Indore, Madhya Pradesh",
      salary: "₹10L a year",
      apply_url: "https://acme.example/apply",
      apply_host: "acme.example",
      posted_label: "2 days ago",
      last_seen_at: Time.current
    )

    payload = JobBlueprint.render_as_hash(job)

    assert_equal "job-1", payload[:id]
    assert_equal "Acme", payload[:company]
    assert_equal "Indore, Madhya Pradesh", payload[:location]
    assert_equal "₹10L a year", payload[:salary]
    assert_equal "https://acme.example/apply", payload[:applyUrl]
    assert_equal "acme.example", payload[:applyHost]
    assert_equal "2 days ago", payload[:postedAt]
  end
end
