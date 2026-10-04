namespace :jobs do
  desc "Fetch Ruby on Rails roles from SerpApi Google Jobs"
  task harvest: :environment do
    result = Serpapi::Harvest.call(force: true)
    puts "Added #{result.added} jobs. #{result.size} stored."
  end
end
