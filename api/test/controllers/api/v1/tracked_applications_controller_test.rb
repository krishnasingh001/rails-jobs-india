require "test_helper"

class Api::V1::TrackedApplicationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Krishna",
      email: "krishna@example.com",
      password: "secret1",
      password_confirmation: "secret1",
      role: "candidate"
    )
    @token = Session.start!(@user)
    @headers = { "Authorization" => "Bearer #{@token}" }
  end

  test "requires a signed in user" do
    get api_v1_tracked_applications_path, as: :json

    assert_response :unauthorized
  end

  test "tracks a job once and lists it under applied" do
    post api_v1_tracked_applications_path, params: job_params, headers: @headers, as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Application tracked.", body["message"]
    assert_equal "applied", body.dig("data", "status")
    assert_equal "Uplers", body.dig("data", "company")

    post api_v1_tracked_applications_path, params: job_params, headers: @headers, as: :json

    assert_response :success
    assert JSON.parse(response.body).dig("meta", "alreadyTracked")
    assert_equal 1, @user.tracked_applications.count

    get api_v1_tracked_applications_path, headers: @headers, as: :json

    listed = JSON.parse(response.body)
    assert_equal 1, listed.dig("data", "applied").length
    assert_equal [], listed.dig("data", "interview")
  end

  test "moves and removes a tracked application" do
    post api_v1_tracked_applications_path, params: job_params, headers: @headers, as: :json
    id = JSON.parse(response.body).dig("data", "id")

    post status_api_v1_tracked_application_path(id), params: { status: "interview" }, headers: @headers, as: :json

    assert_response :success
    assert_equal "interview", JSON.parse(response.body).dig("data", "status")

    delete api_v1_tracked_application_path(id), headers: @headers, as: :json

    assert_response :success
    assert_equal 0, @user.tracked_applications.count
  end

  test "rejects an incomplete application, a bad status, and a missing record" do
    post api_v1_tracked_applications_path, params: { job_external_id: "serp-2" }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_match(/Job title/, JSON.parse(response.body).fetch("message"))

    post api_v1_tracked_applications_path, params: job_params, headers: @headers, as: :json
    id = JSON.parse(response.body).dig("data", "id")

    post status_api_v1_tracked_application_path(id), params: { status: "hired" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "Invalid status.", JSON.parse(response.body).fetch("message")

    post status_api_v1_tracked_application_path(0), params: { status: "interview" }, headers: @headers, as: :json
    assert_response :not_found
  end

  test "reports a status update that does not save" do
    post api_v1_tracked_applications_path, params: job_params, headers: @headers, as: :json
    id = JSON.parse(response.body).dig("data", "id")
    TrackedApplication.class_eval do
      alias_method :update_without_stub, :update
      define_method(:update) { |*| false }
    end

    post status_api_v1_tracked_application_path(id), params: { status: "interview" }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "Could not update this application.", JSON.parse(response.body).fetch("message")
  ensure
    TrackedApplication.class_eval { alias_method :update, :update_without_stub }
  end

  private

  def job_params
    {
      job_external_id: "serp-1",
      job_title: "Ruby on Rails developer",
      company_name: "Uplers",
      job_url: "https://example.com/jobs/1",
      location: "Chennai, Tamil Nadu"
    }
  end
end
