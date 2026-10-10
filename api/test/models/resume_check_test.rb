require "test_helper"

class ResumeCheckTest < ActiveSupport::TestCase
  test "keeps only the newest checks for a user" do
    user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")

    (ResumeCheck::KEEP_PER_USER + 1).times do |index|
      user.resume_checks.create!(
        filename: "resume-#{index}.pdf",
        content_type: "application/pdf",
        byte_size: 4,
        file_data: "%PDF",
        overall_score: 50,
        report: {}
      )
    end

    assert_equal ResumeCheck::KEEP_PER_USER, user.resume_checks.count
    assert_not user.resume_checks.exists?(filename: "resume-0.pdf")
  end
end
