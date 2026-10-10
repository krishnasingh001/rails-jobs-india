require "test_helper"
require "stringio"

class Api::V1::ResumeChecksControllerTest < ActionDispatch::IntegrationTest
  RESUME_LINES = [
    "Asha Verma", "asha@example.com | +91 98765 43210 | Pune, India | github.com/asha",
    "Summary", "Senior Ruby on Rails engineer shipping SaaS products.",
    "Experience", "Acme Corp, Jan 2020 - Present",
    "• Built a Rails billing service handling 2M requests per day",
    "• Reduced p95 latency by 40% by migrating queries to PostgreSQL indexes",
    "• Led a team of 5 engineers and shipped 12 features",
    "• Improved test coverage by 30% using RSpec",
    "• Implemented Sidekiq jobs that cut processing time by 60%",
    "• Optimized Redis caching for 100k users",
    "Beta Ltd, Mar 2016 - Dec 2019", "• Developed REST API endpoints in Ruby on Rails with Docker on AWS",
    "Education", "B.E. Computer Science, 2015", "Skills", "Ruby, Rails, PostgreSQL, Redis, Sidekiq, RSpec, Docker, AWS, GraphQL"
  ].freeze

  def docx_upload(lines, name: "asha-verma-resume.docx")
    io = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("word/document.xml")
      paragraphs = lines.map { |l| "<w:p><w:r><w:t>#{ERB::Util.h(l)}</w:t></w:r></w:p>" }.join
      zip.write %(<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>#{paragraphs}</w:body></w:document>)
    end
    io.rewind
    Rack::Test::UploadedFile.new(io, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", original_filename: name)
  end

  test "scores a strong docx resume" do
    post api_v1_resume_checks_path, params: { resume: docx_upload(RESUME_LINES) }

    assert_response :success
    report = JSON.parse(response.body).fetch("data")
    assert_operator report.fetch("overall_score"), :>=, 75
    assert_equal report.fetch("total_checks"), report.fetch("passed_count") + report.fetch("failed_count")
    assert_equal %w[essentials contact sections content dates rails], report.fetch("categories").map { |c| c["id"] }
  end

  test "adds target role fit when a role is given" do
    post api_v1_resume_checks_path, params: { resume: docx_upload(RESUME_LINES), target_role: "Rails engineer with Sidekiq and Kafka" }

    categories = JSON.parse(response.body).dig("data", "categories")
    target = categories.find { |c| c["id"] == "target" }
    assert target
    assert_match(/kafka/, target["checks"].first["detail"])
  end

  test "flags a thin resume" do
    post api_v1_resume_checks_path, params: { resume: docx_upload([ "Hello" ], name: "resume.docx") }

    assert_response :success
    assert_operator JSON.parse(response.body).dig("data", "overall_score"), :<, 40
  end

  test "reads a pdf" do
    text = "Asha Verma asha@example.com Ruby Rails Experience Skills Education"
    pdf = +"%PDF-1.4\n"
    objs = [
      "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      nil, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ]
    stream = "BT /F1 12 Tf 50 700 Td (#{text}) Tj ET"
    objs[3] = "<< /Length #{stream.length} >>\nstream\n#{stream}\nendstream"
    offsets = objs.each_with_index.map do |body, i|
      off = pdf.bytesize
      pdf << "#{i + 1} 0 obj\n#{body}\nendobj\n"
      off
    end
    xref = pdf.bytesize
    pdf << "xref\n0 #{objs.size + 1}\n0000000000 65535 f \n" + offsets.map { |o| format("%010d 00000 n \n", o) }.join
    pdf << "trailer\n<< /Size #{objs.size + 1} /Root 1 0 R >>\nstartxref\n#{xref}\n%%EOF"
    file = Rack::Test::UploadedFile.new(StringIO.new(pdf), "application/pdf", original_filename: "asha.pdf")

    post api_v1_resume_checks_path, params: { resume: file }

    assert_response :success
    assert_equal "pdf", JSON.parse(response.body).dig("meta", "format")
  end

  test "rejects wrong types and missing files" do
    post api_v1_resume_checks_path
    assert_response :unprocessable_entity

    txt = Rack::Test::UploadedFile.new(StringIO.new("hi"), "text/plain", original_filename: "resume.txt")
    post api_v1_resume_checks_path, params: { resume: txt }
    assert_response :unprocessable_entity

    fake = Rack::Test::UploadedFile.new(StringIO.new("not a pdf"), "application/pdf", original_filename: "resume.pdf")
    post api_v1_resume_checks_path, params: { resume: fake }
    assert_response :unprocessable_entity
  end

  def sign_in_headers
    user = User.create!(name: "Asha", email: "asha@example.com", password: "secret1", password_confirmation: "secret1")
    { "Authorization" => "Bearer #{Session.start!(user)}" }
  end

  test "saves a pdf with a pdf content type" do
    headers = sign_in_headers
    text = "Asha Verma asha@example.com Ruby Rails Experience Skills Education"
    pdf = +"%PDF-1.4\n"
    objs = [
      "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      nil, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ]
    stream = "BT /F1 12 Tf 50 700 Td (#{text}) Tj ET"
    objs[3] = "<< /Length #{stream.length} >>\nstream\n#{stream}\nendstream"
    offsets = objs.each_with_index.map do |body, i|
      off = pdf.bytesize
      pdf << "#{i + 1} 0 obj\n#{body}\nendobj\n"
      off
    end
    xref = pdf.bytesize
    pdf << "xref\n0 #{objs.size + 1}\n0000000000 65535 f \n" + offsets.map { |o| format("%010d 00000 n \n", o) }.join
    pdf << "trailer\n<< /Size #{objs.size + 1} /Root 1 0 R >>\nstartxref\n#{xref}\n%%EOF"
    file = Rack::Test::UploadedFile.new(StringIO.new(pdf), "application/pdf", original_filename: "asha.pdf")

    post api_v1_resume_checks_path, params: { resume: file }, headers: headers

    assert_response :success
    assert_equal "application/pdf", ResumeCheck.last.content_type
  end

  test "signed-out checks are not saved" do
    post api_v1_resume_checks_path, params: { resume: docx_upload(RESUME_LINES) }

    assert_equal false, JSON.parse(response.body).dig("meta", "saved")
    assert_equal 0, ResumeCheck.count
  end

  test "signed-in checks are saved and can be listed, reopened, downloaded and deleted" do
    headers = sign_in_headers
    post api_v1_resume_checks_path, params: { resume: docx_upload(RESUME_LINES), target_role: "Rails" }, headers: headers
    id = JSON.parse(response.body).dig("meta", "id")
    assert id

    get api_v1_resume_checks_path, headers: headers
    row = JSON.parse(response.body).fetch("data").first
    assert_equal "asha-verma-resume.docx", row["filename"]
    assert_nil row["file_data"]

    get api_v1_resume_check_path(id), headers: headers
    assert_equal "essentials", JSON.parse(response.body).dig("data", "categories").first["id"]

    get file_api_v1_resume_check_path(id), headers: headers
    assert_response :success
    assert response.body.start_with?("PK")

    delete api_v1_resume_check_path(id), headers: headers
    assert_equal 0, ResumeCheck.count
  end

  test "history is private to its owner" do
    owner = sign_in_headers
    post api_v1_resume_checks_path, params: { resume: docx_upload(RESUME_LINES) }, headers: owner
    id = JSON.parse(response.body).dig("meta", "id")
    other = User.create!(name: "Ravi", email: "ravi@example.com", password: "secret1", password_confirmation: "secret1")

    get file_api_v1_resume_check_path(id), headers: { "Authorization" => "Bearer #{Session.start!(other)}" }
    assert_response :not_found
    get api_v1_resume_checks_path
    assert_response :unauthorized
  end
end
