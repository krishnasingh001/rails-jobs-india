require "test_helper"

class UserTest < ActiveSupport::TestCase
  setup do
    @user = User.new(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")
  end

  test "rejects a resume link that cannot be parsed" do
    @user.resume_url = "http://%"

    assert_not @user.valid?
    assert_includes @user.errors[:resume_url], "must be a valid http or https link"
  end

  test "rejects a profile that is outside the allowed bounds" do
    @user.avatar = "data:image/png;base64,#{"A" * User::AVATAR_MAX_CHARS}"
    @user.preferred_cities = [ "a" * 61 ] + Array.new(10) { |index| "City #{index}" }
    @user.expected_salary_lpa = 0
    @user.years_experience = 51
    @user.skills = [ "s" * 41 ] + Array.new(40) { |index| "skill #{index}" }

    assert_not @user.valid?
    assert_includes @user.errors[:avatar], "is too large, choose a smaller photo"
    assert_includes @user.errors[:preferred_cities], "can include at most 10 cities"
    assert_includes @user.errors[:preferred_cities], "must be 60 characters or fewer each"
    assert_includes @user.errors[:expected_salary_lpa], "must be between 1 and 1000 lakh per year"
    assert_includes @user.errors[:years_experience], "must be between 0 and 50"
    assert_includes @user.errors[:skills], "can include at most 40 entries"
    assert_includes @user.errors[:skills], "must be 40 characters or fewer each"
  end
end
