require "test_helper"

class Api::V1::ProfilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")
    @headers = { "Authorization" => "Bearer #{Session.start!(@user)}" }
  end

  test "requires sign in" do
    get api_v1_profile_path

    assert_response :unauthorized
  end

  test "saves preferences" do
    patch api_v1_profile_path, headers: @headers, params: {
      preferred_cities: [ "Pune", "pune", "Indore" ],
      work_modes: %w[remote hybrid],
      expected_salary_lpa: 18,
      years_experience: 4.5,
      ai_fluency: "builder",
      skills: [ "Ruby on Rails" ]
    }

    assert_response :success
    user = JSON.parse(response.body).fetch("user")
    assert_equal %w[Pune Indore], user["preferred_cities"]
    assert_equal %w[remote hybrid], user["work_modes"]
    assert_equal 18, user["expected_salary_lpa"]
    assert_equal 4.5, user["years_experience"]
    assert_equal "builder", user["ai_fluency"]
  end

  test "clears salary and experience when sent blank" do
    @user.update!(expected_salary_lpa: 10, years_experience: 3)

    patch api_v1_profile_path, headers: @headers, params: { expected_salary_lpa: "", years_experience: "" }

    assert_response :success
    assert_nil @user.reload.expected_salary_lpa
    assert_nil @user.years_experience
  end

  test "saves and removes a profile photo" do
    photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    patch api_v1_profile_path, headers: @headers, params: { avatar: photo }

    assert_response :success
    assert_equal photo, JSON.parse(response.body).dig("user", "avatar")

    patch api_v1_profile_path, headers: @headers, params: { avatar: "" }

    assert_response :success
    assert_nil @user.reload.avatar
  end

  test "rejects a profile photo that is not an image" do
    patch api_v1_profile_path, headers: @headers, params: { avatar: "data:text/html;base64,PHNjcmlwdD4=" }

    assert_response :unprocessable_entity
  end

  test "rejects unknown work modes and AI levels" do
    patch api_v1_profile_path, headers: @headers, params: { work_modes: [ "moon" ], ai_fluency: "wizard" }

    assert_response :unprocessable_entity
    assert_match(/work modes/i, JSON.parse(response.body)["message"])
  end
end
