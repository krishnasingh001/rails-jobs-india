class JobBlueprint < Blueprinter::Base
  identifier :external_id, name: :id

  fields :title, :location, :description, :via

  field :company_name, name: :company
  field :salary
  field :remote
  field :remote_source, name: :remoteSource
  field :apply_url, name: :applyUrl
  field :apply_host, name: :applyHost
  field :posted_label, name: :postedAt

  field :skills do |job|
    Resume::SkillExtractor.call("#{job.title}\n#{job.description}")
  end

  field :extensions do |job|
    Array(job.raw["extensions"]).select { |item| item.is_a?(String) && item.present? }
  end

  field :applyOptions do |job|
    Array(job.raw["apply_options"]).filter_map do |option|
      next unless option.is_a?(Hash) && option["link"].present?

      { title: option["title"].presence || option["link"], link: option["link"] }
    end
  end

  field :shareLink do |job|
    job.raw["share_link"].presence
  end

  field :thumbnail do |job|
    job.raw["thumbnail"].presence
  end

  # Where this listing came from: the SerpApi Google Jobs search that returned it
  # and when we last saw it. fetchedAt is our crawl time, not Google's posting time.
  field :provenance do |job|
    {
      source: "Google Jobs",
      via: job.via,
      query: job.query,
      searchLocation: job.search_location,
      firstSeenAt: job.created_at&.utc&.iso8601,
      fetchedAt: job.last_seen_at&.utc&.iso8601,
      originalUrl: job.raw["source_link"].presence || job.apply_url
    }
  end
end
