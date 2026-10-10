require "test_helper"

class Api::V1::JobFitsControllerTest < ActionDispatch::IntegrationTest
  DESCRIPTION = "We need a Rails engineer with Postgres, Redis and Docker. Kubernetes is a plus."

  test "lists the skills a posting asks for when signed out" do
    post api_v1_job_fit_path, params: { title: "Backend", description: DESCRIPTION }

    assert_response :success
    data = JSON.parse(response.body).fetch("data")
    names = data.fetch("required").map { |s| s["name"] }
    assert_equal [ "Ruby on Rails", "PostgreSQL", "Redis", "Docker", "Kubernetes" ], names
    assert_equal [ "postgres" ], data.fetch("required").find { |s| s["name"] == "PostgreSQL" }.fetch("terms")
    assert_equal false, data.fetch("signed_in")
    assert_nil data.fetch("ats_score")
  end

  test "scores the candidate's saved skills against the posting" do
    skills = [ "Ruby on Rails", "Redis", "Docker" ]
    fit = Resume::JobFit.call(description: DESCRIPTION, skills: skills)

    assert_equal skills, fit[:matched]
    assert_equal [ "PostgreSQL", "Kubernetes" ], fit[:missing]
    assert_equal 60, fit[:score]
  end

  test "has no score when the posting names no known skills" do
    assert_nil Resume::JobFit.call(description: "Great culture", skills: [ "Ruby" ])[:score]
  end

  test "scores against the chosen resume when one is given" do
    user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1", skills: [ "Redis" ])
    resume = user.user_resumes.create!(label: "Backend", skills: [ "Ruby on Rails", "Redis", "Docker" ])
    headers = { "Authorization" => "Bearer #{Session.start!(user)}" }

    post api_v1_job_fit_path, headers: headers, params: { description: DESCRIPTION, resume_id: resume.id }

    assert_equal 60, JSON.parse(response.body).dig("data", "score")

    post api_v1_job_fit_path, headers: headers, params: { description: DESCRIPTION }

    assert_equal 20, JSON.parse(response.body).dig("data", "score")
  end
end
