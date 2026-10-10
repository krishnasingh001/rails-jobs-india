# Runs once a day (see config/recurring.yml) so visitors never trigger SerpApi calls.
class HarvestJobsJob < ApplicationJob
  queue_as :default

  retry_on Serpapi::Error, wait: 30.minutes, attempts: 3

  def perform
    result = Serpapi::Harvest.call(force: true)
    Rails.logger.info("HarvestJobsJob added #{result.added} jobs, #{result.size} stored.")
  end
end
