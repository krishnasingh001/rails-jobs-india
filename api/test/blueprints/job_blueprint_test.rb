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

  test "lists the skills a job asks for" do
    job = Job.new(external_id: "job-2", title: "Rails Dev", company_name: "Acme", description: "You know Postgres and Sidekiq.", last_seen_at: Time.current)

    assert_equal [ "Ruby on Rails", "PostgreSQL", "Sidekiq" ], JobBlueprint.render_as_hash(job)[:skills]
  end

  test "renders the detail fields from the stored SerpApi payload" do
    job = Job.new(
      external_id: "job-2",
      title: "Rails Dev",
      company_name: "Acme",
      description: "Build things.\n\nShip them.",
      via: "Jooble",
      last_seen_at: Time.current,
      raw: {
        "extensions" => ["3 days ago", "Full–time", nil],
        "apply_options" => [{ "title" => "Jooble", "link" => "https://jooble.example/1" }, { "title" => "No link" }],
        "share_link" => "https://google.example/share",
        "thumbnail" => "https://img.example/logo.png"
      }
    )

    payload = JobBlueprint.render_as_hash(job)

    assert_equal "Build things.\n\nShip them.", payload[:description]
    assert_equal "Jooble", payload[:via]
    assert_equal ["3 days ago", "Full–time"], payload[:extensions]
    assert_equal [{ title: "Jooble", link: "https://jooble.example/1" }], payload[:applyOptions]
    assert_equal "https://google.example/share", payload[:shareLink]
    assert_equal "https://img.example/logo.png", payload[:thumbnail]
  end

  test "renders where the listing came from" do
    job = Job.create!(
      external_id: "job-4", title: "T", company_name: "C", via: "BeBee", query: "Rails", search_location: "Pune",
      apply_url: "https://apply.example/1", last_seen_at: Time.utc(2026, 10, 4, 9, 30),
      raw: { "source_link" => "https://board.example/job/1" }
    )

    provenance = JobBlueprint.render_as_hash(job)[:provenance]

    assert_equal "Google Jobs", provenance[:source]
    assert_equal "Rails", provenance[:query]
    assert_equal "Pune", provenance[:searchLocation]
    assert_equal "2026-10-04T09:30:00Z", provenance[:fetchedAt]
    assert_equal "https://board.example/job/1", provenance[:originalUrl]
  end

  test "provenance falls back to the apply link" do
    job = Job.new(external_id: "job-5", title: "T", company_name: "C", apply_url: "https://apply.example/2", last_seen_at: Time.current)

    assert_equal "https://apply.example/2", JobBlueprint.render_as_hash(job)[:provenance][:originalUrl]
  end

  test "detail fields are empty when the payload has none" do
    job = Job.new(external_id: "job-3", title: "T", company_name: "C", last_seen_at: Time.current)

    payload = JobBlueprint.render_as_hash(job)

    assert_equal [], payload[:extensions]
    assert_equal [], payload[:applyOptions]
    assert_nil payload[:shareLink]
    assert_nil payload[:thumbnail]
  end
end
