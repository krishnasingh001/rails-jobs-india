require "test_helper"

class Resume::AtsCheckerTest < ActiveSupport::TestCase
  test "warns when the target role has no usable keywords" do
    extraction = Resume::TextExtractor::Result.new(text: "Ruby on Rails engineer.", format: :docx, pages: nil, tables: 0)

    report = Resume::AtsChecker.call(extraction, filename: "asha.pdf", target_role: "a")

    detail = report[:categories].find { |category| category[:id] == "target" }[:checks].first[:detail]
    assert_equal "Target role had no usable keywords.", detail
  end

  test "describes a score that is close" do
    checker = Resume::AtsChecker.allocate

    assert_equal "Close. 3 fixes left.", checker.send(:summary_for, 72, 3)
  end
end
