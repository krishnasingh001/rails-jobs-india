require "test_helper"

class Api::V1::CompanyInsightsControllerTest < ActionDispatch::IntegrationTest
  test "returns the stored profile with its sources, matched case-insensitively" do
    CompanyInsight.create!(
      company_name: "Excal Technologies",
      profile_fetched_at: Time.utc(2026, 10, 4, 9, 56),
      profile: {
        "layoffs_last_year" => "No layoffs found.",
        "head_count" => "26 employees (per ZoomInfo)",
        "office_locations" => ["Pune, Maharashtra, India"],
        "values" => "No publicly documented company values found.",
        "founded_year" => 2013
      },
      domain_area: "IT outsourcing.",
      profile_references: [
        { "title" => "Zauba", "link" => "https://www.zaubacorp.com/x", "source_icon" => "https://imgs.search.brave.com/i" },
        { "title" => "Bad", "link" => "javascript:alert(1)" }
      ]
    )

    get api_v1_company_insight_path, params: { company: "excal technologies" }

    assert_response :success
    insight = JSON.parse(response.body).fetch("insight")
    assert_equal "26 employees (per ZoomInfo)", insight.fetch("headCount")
    assert_equal ["Pune, Maharashtra, India"], insight.fetch("offices")
    assert_equal 2013, insight.fetch("foundedYear")
    assert_equal "2026-10-04T09:56:00Z", insight.fetch("fetchedAt")
    assert_equal ["https://www.zaubacorp.com/x"], insight.fetch("sources").map { |source| source["link"] }
  end

  test "returns null when the company has no profile" do
    get api_v1_company_insight_path, params: { company: "Nobody" }

    assert_response :success
    assert_nil JSON.parse(response.body).fetch("insight")
  end
end
