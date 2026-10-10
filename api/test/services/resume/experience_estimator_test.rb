require "test_helper"

class Resume::ExperienceEstimatorTest < ActiveSupport::TestCase
  TODAY = Date.new(2026, 10, 11)

  def estimate(text)
    Resume::ExperienceEstimator.call(text, today: TODAY)
  end

  test "uses a stated figure first" do
    result = estimate("Senior Rails engineer with 6+ years of experience building APIs.")

    assert_equal({ years: 6.0, source: "stated" }, result)
  end

  test "reads the reversed wording" do
    assert_equal 4.5, estimate("Experience of 4.5 years in Ruby on Rails")[:years]
  end

  test "adds up month-year ranges and counts present as today" do
    text = "Acme  Jan 2020 - Dec 2021\nBeta  Nov 2024 - Present"

    result = estimate(text)

    assert_equal "dates", result[:source]
    assert_equal 4.0, result[:years]
  end

  test "merges overlapping jobs instead of double counting" do
    text = "A: Jan 2020 - Dec 2021\nB: Jun 2021 - Dec 2022"

    assert_equal 3.0, estimate(text)[:years]
  end

  test "reads numeric month ranges" do
    assert_equal 2.0, estimate("Dev 01/2021 - 12/2022")[:years]
  end

  test "ignores year-only ranges such as education" do
    assert_equal({ years: nil, source: nil }, estimate("B.Tech 2014 - 2018"))
  end

  test "returns nothing for text with no dates" do
    assert_nil estimate("I like Rails.")[:years]
  end

  test "ignores named ranges that run backwards or into the future" do
    assert_nil estimate("Dev Dec 2021 - Jan 2020")[:years]
    assert_nil estimate("Dev Jan 2030 - Dec 2031")[:years]
  end

  test "ignores numeric months outside 1 to 12 and ranges that end first" do
    assert_nil estimate("Dev 13/2020 - 06/2021")[:years]
    assert_nil estimate("Dev 01/2020 - 13/2021")[:years]
    assert_nil estimate("Dev 12/2021 - 01/2020")[:years]
  end

  test "reads a numeric range that is still going" do
    assert_equal 5.8, estimate("Dev 01/2021 - Present")[:years]
  end

  test "returns nothing when the merged span covers no months" do
    estimator = Resume::ExperienceEstimator.new("Jan 2020 - Dec 2021", TODAY)
    estimator.define_singleton_method(:merge) { |*| [ [ 1, 1 ] ] }

    assert_nil estimator.send(:years_from_dates)
  end
end
