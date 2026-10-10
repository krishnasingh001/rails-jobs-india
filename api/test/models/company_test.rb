require "test_helper"

class CompanyTest < ActiveSupport::TestCase
  test "requires a unique company name" do
    Company.create!(company_name: "Acme")

    blank = Company.new(company_name: "")
    assert_not blank.valid?
    assert_includes blank.errors[:company_name], "can't be blank"

    duplicate = Company.new(company_name: "Acme")
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:company_name], "has already been taken"
  end
end
