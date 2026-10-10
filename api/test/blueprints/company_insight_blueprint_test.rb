require "test_helper"

class CompanyInsightBlueprintTest < ActiveSupport::TestCase
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
