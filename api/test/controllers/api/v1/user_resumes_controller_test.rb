require "test_helper"

class Api::V1::UserResumesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")
    @headers = { "Authorization" => "Bearer #{Session.start!(@user)}" }
  end

  test "requires sign in" do
    get api_v1_user_resumes_path

    assert_response :unauthorized
  end

  test "creates a resume and lists it" do
    post api_v1_user_resumes_path, headers: @headers, params: {
      label: "Backend", skills: [ "Ruby on Rails", "ruby on rails", "PostgreSQL" ], years_experience: 4.5, ai_fluency: "user", ai_signals: [ "ChatGPT" ]
    }

    assert_response :created
    created = JSON.parse(response.body).fetch("data")
    assert_equal "Backend", created["label"]
    assert_equal [ "Ruby on Rails", "PostgreSQL" ], created["skills"]
    assert_equal 4.5, created["years_experience"]

    get api_v1_user_resumes_path, headers: @headers
    assert_equal [ "Backend" ], JSON.parse(response.body).fetch("data").map { |resume| resume["label"] }
  end

  test "the user payload carries the resumes" do
    @user.user_resumes.create!(label: "Full-stack", skills: [ "React" ])

    get api_v1_auth_me_path, headers: @headers

    assert_equal [ "Full-stack" ], JSON.parse(response.body).dig("user", "resumes").map { |resume| resume["label"] }
  end

  test "labels must be present and unique" do
    @user.user_resumes.create!(label: "Backend")

    post api_v1_user_resumes_path, headers: @headers, params: { label: "backend" }
    assert_response :unprocessable_entity

    post api_v1_user_resumes_path, headers: @headers, params: { label: "" }
    assert_response :unprocessable_entity
  end

  test "keeps at most five resumes" do
    UserResume::MAX_PER_USER.times { |index| @user.user_resumes.create!(label: "Resume #{index}") }

    post api_v1_user_resumes_path, headers: @headers, params: { label: "One too many" }

    assert_response :unprocessable_entity
    assert_match(/at most 5/, JSON.parse(response.body)["message"])
  end

  test "updates and deletes only the user's own resume" do
    mine = @user.user_resumes.create!(label: "Backend")
    other = User.create!(name: "Ravi", email: "ravi@example.com", password: "secret1", password_confirmation: "secret1")
    theirs = other.user_resumes.create!(label: "Theirs")

    patch api_v1_user_resume_path(mine), headers: @headers, params: { label: "Rails backend", skills: [ "Sidekiq" ] }
    assert_response :success
    assert_equal [ "Rails backend", [ "Sidekiq" ] ], [ mine.reload.label, mine.skills ]

    patch api_v1_user_resume_path(theirs), headers: @headers, params: { label: "Mine now" }
    assert_response :not_found

    delete api_v1_user_resume_path(mine), headers: @headers
    assert_response :success
    assert_not UserResume.exists?(mine.id)
  end

  test "clears years of experience when the field is sent blank" do
    mine = @user.user_resumes.create!(label: "Backend", years_experience: 4)

    patch api_v1_user_resume_path(mine), headers: @headers, params: { years_experience: "" }

    assert_response :success
    assert_nil mine.reload.years_experience
  end
end
