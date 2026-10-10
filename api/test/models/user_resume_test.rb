require "test_helper"

class UserResumeTest < ActiveSupport::TestCase
  test "rejects too many skills and a skill that is too long" do
    user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")
    resume = user.user_resumes.build(
      label: "Backend",
      skills: [ "s" * 41 ] + Array.new(40) { |index| "skill #{index}" }
    )

    assert_not resume.valid?
    assert_includes resume.errors[:skills], "can include at most 40 entries"
    assert_includes resume.errors[:skills], "must be 40 characters or fewer each"
  end
end
