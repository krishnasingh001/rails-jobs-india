require "test_helper"

class Api::V1::LogosControllerTest < ActionDispatch::IntegrationTest
  test "serves the stored logo with a long public cache" do
    company = Company.create!(company_name: "Acme", logo_data: "png-bytes", logo_content_type: "image/png")

    get api_v1_logo_path(company)

    assert_response :success
    assert_equal "png-bytes", response.body
    assert_equal "image/png", response.media_type
    assert_includes response.headers["Cache-Control"], "public"
  end

  test "returns not found for a company without a logo" do
    company = Company.create!(company_name: "Bare Co")

    get api_v1_logo_path(company)

    assert_response :not_found
  end
end
