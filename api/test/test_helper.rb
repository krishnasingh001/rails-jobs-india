require "simplecov"
SimpleCov.start "rails" do
  enable_coverage :branch
  group "Blueprints", "app/blueprints"
  group "Services", "app/services"
  coverage :line, minimum: 100
  coverage :branch, minimum: 100
end

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers.
    # The Rails SimpleCov profile merges these workers into one report.
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
