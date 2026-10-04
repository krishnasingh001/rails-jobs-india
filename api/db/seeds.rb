require "json"

seed_dir = Rails.root.join("db/seed")

JSON.parse(File.read(seed_dir.join("jobs.json"))).each do |attrs|
  Job.find_or_create_by!(external_id: attrs.fetch("external_id")) do |job|
    job.assign_attributes(attrs.except("external_id"))
    job.last_seen_at = Time.current
  end
end

JSON.parse(File.read(seed_dir.join("company_places.json"))).each do |attrs|
  CompanyPlace.find_or_create_by!(
    company_name: attrs.fetch("company_name"),
    search_location: attrs.fetch("search_location")
  ) do |place|
    place.assign_attributes(attrs.except("company_name", "search_location"))
  end
end

if SerpapiFetch.none?
  SerpapiFetch.create!(fetched_at: Time.current, job_count: Job.count)
end
