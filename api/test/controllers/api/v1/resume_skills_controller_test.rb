require "test_helper"

class Api::V1::ResumeSkillsControllerTest < ActionDispatch::IntegrationTest
  def docx_upload(lines, name: "resume.docx")
    io = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("word/document.xml")
      paragraphs = lines.map { |l| "<w:p><w:r><w:t>#{ERB::Util.h(l)}</w:t></w:r></w:p>" }.join
      zip.write %(<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>#{paragraphs}</w:body></w:document>)
    end
    io.rewind
    Rack::Test::UploadedFile.new(io, "application/octet-stream", original_filename: name)
  end

  test "extracts skills in order of appearance without false substring hits" do
    post api_v1_resume_skills_path, params: {
      resume: docx_upload([ "Senior Ruby on Rails developer", "Skills: PostgreSQL, Redis, Sidekiq, RSpec, Docker, JavaScript", "Worked on a Gojira project in Javascripting" ])
    }

    assert_response :success
    skills = JSON.parse(response.body).fetch("skills")
    assert_equal [ "Ruby", "Ruby on Rails", "PostgreSQL", "Redis", "Sidekiq", "RSpec", "Docker", "JavaScript" ], skills.first(8)
    assert_not_includes skills, "Go"
  end

  test "also reads years of experience and AI fluency" do
    post api_v1_resume_skills_path, params: {
      resume: docx_upload([ "Rails engineer with 5 years of experience.", "Built a RAG pipeline with pgvector and used GitHub Copilot daily." ])
    }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal({ "years" => 5.0, "source" => "stated" }, body["years_experience"])
    assert_equal "expert", body.dig("ai_fluency", "level")
    assert_includes body.dig("ai_fluency", "signals"), "RAG"
  end

  test "rejects missing and unreadable files" do
    post api_v1_resume_skills_path
    assert_response :unprocessable_entity

    junk = Rack::Test::UploadedFile.new(StringIO.new("nope"), "application/pdf", original_filename: "resume.pdf")
    post api_v1_resume_skills_path, params: { resume: junk }
    assert_response :unprocessable_entity
  end
end
