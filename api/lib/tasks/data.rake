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
