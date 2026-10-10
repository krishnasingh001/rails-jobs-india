namespace :data do
  desc "Load the JSON files in api/data (source of truth) into the database"
  task import: :environment do
    DataImport.call.each { |name, count| puts "#{name}: #{count}" }
  end
end

namespace :data do
  desc "Fetch a structured company profile via Brave AI Mode. COMPANY=GitLab (required)"
  task fetch_company_profile: :environment do
    name = ENV["COMPANY"].presence or abort "Pass COMPANY=name"
    raise Serpapi::MissingKey if Serpapi::Client.new.api_key.blank?

    result = Serpapi::CompanyProfile.call(name)
    dir = Rails.root.join("data", "company_profiles")
    FileUtils.mkdir_p(dir)
    file = dir.join("#{name.downcase.gsub(/[^a-z0-9]+/, '_')}.json")
    File.write(file, JSON.pretty_generate(result))
    puts "Wrote #{file}"
    DataImport.call
  end
end

namespace :data do
  desc "Fetch structured profiles for every company in the companies table into data/company_profiles (skips existing files; JSON only)"
  task fetch_all_company_profiles: :environment do
    raise Serpapi::MissingKey if Serpapi::Client.new.api_key.blank?

    dir = Rails.root.join("data", "company_profiles")
    FileUtils.mkdir_p(dir)
    names = Company.order(:company_name).pluck(:company_name)
    failed = []

    names.each_with_index do |name, i|
      file = dir.join("#{name.downcase.gsub(/[^a-z0-9]+/, '_')}.json")
      if file.exist?
        puts "[#{i + 1}/#{names.size}] skip #{name}"
        next
      end

      begin
        File.write(file, JSON.pretty_generate(Serpapi::CompanyProfile.call(name)))
        puts "[#{i + 1}/#{names.size}] ok   #{name}"
      rescue Serpapi::Error => e
        failed << name
        puts "[#{i + 1}/#{names.size}] FAIL #{name}: #{e.message}"
      end
    end

    puts "Done. #{names.size - failed.size} ok/skipped, #{failed.size} failed#{": #{failed.join(', ')}" if failed.any?}"
  end
end

namespace :data do
  COMPANY_JOB_TARGETS = %w[GitLab Procore Zendesk Gojek G2 BigBinary Cisco MSCI Easyship Accenture].freeze

  desc "Fetch jobs and profiles for target companies into api/data (skips existing files; FORCE=1 refetches jobs). COMPANIES=A,B overrides the list"
  task fetch_company_jobs: :environment do
    raise Serpapi::MissingKey if Serpapi::Client.new.api_key.blank?

    names = ENV["COMPANIES"].present? ? ENV["COMPANIES"].split(",").map(&:strip) : COMPANY_JOB_TARGETS
    slug = ->(name) { name.downcase.gsub(/[^a-z0-9]+/, "_") }
    data = Rails.root.join("data")
    companies_file = data.join("companies/companies.json")
    failed = []

    names.each do |name|
      jobs_file = data.join("jobs/company_#{slug.(name)}.json")
      if jobs_file.exist? && ENV["FORCE"].blank?
        puts "jobs    skip #{name}"
      else
        begin
          payload = Serpapi::CompanyJobs.call(name)
          File.write(jobs_file, JSON.pretty_generate(payload))
          entries = Serpapi::CompanyJobs.merge_companies(JSON.parse(File.read(companies_file)), payload["jobs"])
          File.write(companies_file, JSON.pretty_generate(entries))
          puts "jobs    ok   #{name}: #{payload['jobs'].size} (#{payload['query']})"
        rescue Serpapi::Error => e
          failed << "#{name} jobs"
          puts "jobs    FAIL #{name}: #{e.message}"
        end
      end

      profile_file = data.join("company_profiles/#{slug.(name)}.json")
      if profile_file.exist?
        puts "profile skip #{name}"
      else
        begin
          File.write(profile_file, JSON.pretty_generate(Serpapi::CompanyProfile.call(name)))
          puts "profile ok   #{name}"
        rescue Serpapi::Error => e
          failed << "#{name} profile"
          puts "profile FAIL #{name}: #{e.message}"
        end
      end
    end

    DataImport.call.each { |kind, count| puts "#{kind}: #{count}" }
    puts "Failed: #{failed.join(', ')}" if failed.any?
  end
end

namespace :data do
  desc "Download a logo for every company into data/logos and record it in companies.json (skips logos already saved), then import"
  task fetch_logos: :environment do
    require "open-uri"

    data = Rails.root.join("data")
    dir = data.join("logos")
    FileUtils.mkdir_p(dir)
    companies_file = data.join("companies/companies.json")
    entries = JSON.parse(File.read(companies_file)).index_by { |entry| entry["company_name"] }
    domains = JSON.parse(File.read(data.join("companies/domains.json")))

    # Google Jobs logos first; a site icon by domain only when there is none.
    images = entries.transform_values { |entry| entry["logo"].presence }.compact
    Job.find_each { |job| images[job.company_name] ||= job.raw["thumbnail"].presence }
    names = (Job.distinct.pluck(:company_name) + entries.keys).uniq.sort
    missing = []

    names.each do |name|
      entry = entries[name] ||= { "company_name" => name, "logo" => nil, "job_count" => 0, "states" => [], "locations" => [], "via_sources" => [], "job_ids" => [] }
      next if entry["logo_file"].present? && dir.join(entry["logo_file"]).exist?

      source = images[name] || (domains[name] && "https://www.google.com/s2/favicons?domain=#{domains[name]}&sz=128")
      if source.nil?
        missing << name
        next
      end

      begin
        URI.open(source, "User-Agent" => "Mozilla/5.0", read_timeout: 30) do |io|
          ext = { "image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp", "image/svg+xml" => "svg", "image/gif" => "gif" }.fetch(io.content_type, "ico")
          file = "#{name.downcase.gsub(/[^a-z0-9]+/, '_').delete_suffix('_')}.#{ext}"
          File.binwrite(dir.join(file), io.read)
          entry["logo_file"] = file
        end
        puts "ok   #{name}"
      rescue OpenURI::HTTPError, SocketError, Timeout::Error, Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout => e
        missing << name
        puts "FAIL #{name}: #{e.message}"
      end
    end

    File.write(companies_file, JSON.pretty_generate(entries.values))
    puts "No logo: #{missing.join(', ')}"
    DataImport.call.each { |kind, count| puts "#{kind}: #{count}" }
  end
end
