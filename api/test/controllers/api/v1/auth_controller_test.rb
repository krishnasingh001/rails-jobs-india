require "test_helper"

class Api::V1::AuthControllerTest < ActionDispatch::IntegrationTest
  test "creates a candidate account and signs them in" do
    post api_v1_auth_register_path, params: {
      name: "Krishna Singh",
      email: "krishna@example.com",
      password: "secret1",
      password_confirmation: "secret1",
      role: "candidate"
    }, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Krishna Singh", body.dig("user", "name")
    assert_equal "candidate", body.dig("user", "role")
    assert body["auth_token"].present?

    get api_v1_auth_me_path, headers: { "Authorization" => "Bearer #{body['auth_token']}" }

    assert_response :success
    assert_equal "krishna@example.com", JSON.parse(response.body).dig("user", "email")
  end

  test "signs in with the right password and rejects the wrong one" do
    User.create!(name: "Krishna", email: "krishna@example.com", password: "secret1", password_confirmation: "secret1", role: "candidate")

    post api_v1_auth_login_path, params: { email: "krishna@example.com", password: "nope" }, as: :json
    assert_response :unauthorized

    post api_v1_auth_login_path, params: { email: "krishna@example.com", password: "secret1" }, as: :json
    assert_response :success
    token = JSON.parse(response.body)["auth_token"]

    delete api_v1_auth_logout_path, headers: { "Authorization" => "Bearer #{token}" }
    assert_response :success

    get api_v1_auth_me_path, headers: { "Authorization" => "Bearer #{token}" }
    assert_nil JSON.parse(response.body)["user"]
  end

  test "stores the resume link and skills at sign up" do
    post api_v1_auth_register_path, params: {
      name: "Asha Verma", email: "asha@example.com", password: "secret1", password_confirmation: "secret1",
      role: "candidate", resume_url: " https://drive.example.com/asha.pdf ", skills: [ "Ruby", "ruby", " Rails ", "" ]
    }, as: :json

    assert_response :created
    user = JSON.parse(response.body).fetch("user")
    assert_equal "https://drive.example.com/asha.pdf", user.fetch("resume_url")
    assert_equal [ "Ruby", "Rails" ], user.fetch("skills")
  end

  test "rejects a resume link that is not http" do
    post api_v1_auth_register_path, params: {
      name: "Asha Verma", email: "asha@example.com", password: "secret1", password_confirmation: "secret1",
      resume_url: "javascript:alert(1)"
    }, as: :json

    assert_response :unprocessable_entity
    assert_match(/Resume url/, JSON.parse(response.body).fetch("message"))
  end
end
