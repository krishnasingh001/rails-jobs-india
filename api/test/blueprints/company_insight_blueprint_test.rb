require "test_helper"

class CompanyInsightBlueprintTest < ActiveSupport::TestCase
  test "turns structured layoff, head count and value lists into readable text" do
    insight = CompanyInsight.new(
      company_name: "Structured",
      profile: {
        "layoffs_last_year" => [
          { "date" => "May 13, 2026", "employees_affected" => "<4,000", "percent_of_workforce" => "<5%", "note" => "Global cut" },
          "No other event",
          ""
        ],
        "head_count" => { "count" => 860 },
        "values" => [ "Respect", "" ],
        "office_locations" => [ "Pune" ]
      }
    )

    payload = CompanyInsightBlueprint.render_as_hash(insight)

    assert_equal "May 13, 2026 · <4,000 people · <5%\nGlobal cut\nNo other event", payload[:layoffs]
    assert_equal "860", payload[:headCount]
    assert_equal "Respect", payload[:values]
  end

  test "formats a head count dated hash and drops an empty object" do
    insight = CompanyInsight.new(
      company_name: "Dated",
      profile: {
        "layoffs_last_year" => { "note" => "Mentioned, not quantified" },
        "head_count" => { "total" => 47_000, "as_of" => "December 31, 2025" },
        "values" => { "summary" => [ "A", "" ] }
      }
    )

    payload = CompanyInsightBlueprint.render_as_hash(insight)

    assert_equal "Mentioned, not quantified", payload[:layoffs]
    assert_equal "47000, as of December 31, 2025", payload[:headCount]
    assert_equal "A", payload[:values]
    assert_nil CompanyInsightBlueprint.text({})
    assert_equal "as of July 2026", CompanyInsightBlueprint.text({ "as_of" => "July 2026" })
  end

  test "renders nothing for a profile that was never fetched and has no founded year" do
    insight = CompanyInsight.new(
      company_name: "Bare",
      profile: { "founded_year" => "", "office_locations" => [ "Pune", "" ] }
    )

    payload = CompanyInsightBlueprint.render_as_hash(insight)

    assert_nil payload[:fetchedAt]
    assert_nil payload[:foundedYear]
    assert_equal [ "Pune" ], payload[:offices]
  end

  test "leaves fetchedAt empty when the timestamp cannot be converted to utc" do
    insight = CompanyInsight.new(company_name: "Odd", profile: {})
    stamp = Object.new
    stamp.define_singleton_method(:utc) { nil }
    insight.define_singleton_method(:profile_fetched_at) { stamp }

    assert_nil CompanyInsightBlueprint.render_as_hash(insight)[:fetchedAt]
  end
end
