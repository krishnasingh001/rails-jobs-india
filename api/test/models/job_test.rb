require "test_helper"

class JobTest < ActiveSupport::TestCase
  test "requires a unique external id" do
    attributes = {
      external_id: "job-1",
      title: "Rails Dev",
      company_name: "Acme",
      last_seen_at: Time.current
    }

    Job.create!(attributes)
    duplicate = Job.new(attributes)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:external_id], "has already been taken"
  end
end
