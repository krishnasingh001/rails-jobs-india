require "test_helper"

class HarvestJobsJobTest < ActiveJob::TestCase
  test "forces a harvest" do
    forced = nil
    singleton = class << Serpapi::Harvest; self; end
    original = Serpapi::Harvest.method(:call)
    singleton.define_method(:call) do |force: false, **|
      forced = force
      Serpapi::Harvest::Result.new(jobs: [], added: 0)
    end

    HarvestJobsJob.perform_now

    assert forced
  ensure
    singleton&.define_method(:call) { |*args, **kwargs, &block| original.call(*args, **kwargs, &block) }
  end

  test "is not scheduled while the schedule is paused" do
    assert_nil YAML.load_file(Rails.root.join("config/recurring.yml")).dig("production", "harvest_jobs")
  end
end
