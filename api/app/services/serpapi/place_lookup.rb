require "uri"

module Serpapi
  class PlaceLookup
    CITIES = [
      [ "visakhapatnam", 17.6868, 83.2185 ],
      [ "bhubaneswar", 20.2961, 85.8245 ],
      [ "coimbatore", 11.0168, 76.9558 ],
      [ "chandigarh", 30.7333, 76.7794 ],
      [ "ahmedabad", 23.0225, 72.5714 ],
      [ "hyderabad", 17.385, 78.4867 ],
      [ "bengaluru", 12.9716, 77.5946 ],
      [ "bangalore", 12.9716, 77.5946 ],
      [ "new delhi", 28.6139, 77.209 ],
      [ "gurugram", 28.4595, 77.0266 ],
      [ "gurgaon", 28.4595, 77.0266 ],
      [ "kolkata", 22.5726, 88.3639 ],
      [ "lucknow", 26.8467, 80.9462 ],
      [ "chennai", 13.0827, 80.2707 ],
      [ "mumbai", 19.076, 72.8777 ],
      [ "mysuru", 12.2958, 76.6394 ],
      [ "jaipur", 26.9124, 75.7873 ],
      [ "indore", 22.7196, 75.8577 ],
      [ "nagpur", 21.1458, 79.0882 ],
      [ "noida", 28.5355, 77.391 ],
      [ "kochi", 9.9312, 76.2673 ],
      [ "delhi", 28.6139, 77.209 ],
      [ "pune", 18.5204, 73.8567 ]
    ].freeze

    def self.call(job, client: nil)
      new(job, client: client).call
    end

    def initialize(job, client: nil)
      @job = job
      @client = client || Client.new
    end

    def call
      cached = CompanyPlace.find_by(company_name: job.company_name, search_location: job.location.to_s)
      return cached if cached

      raise MissingKey if client.api_key.blank?

      payload = client.google_maps(query: search_query, ll: map_ll)
      listing = choose(payload)
      CompanyPlace.create!(attributes_for(listing))
    end

    private

    attr_reader :job, :client

    def search_query
      [ job.company_name, job.location ].compact_blank.join(" ")
    end

    def map_ll
      latitude, longitude, zoom = map_center
      "@#{latitude},#{longitude},#{zoom}z"
    end

    def map_center
      text = job.location.to_s.downcase
      city = CITIES.select { |name, _, _| text.include?(name) }.max_by { |name, _, _| name.length }
      return [ 22.5, 79.0, 5 ] if city.nil?

      [ city[1], city[2], 13 ]
    end

    def choose(payload)
      results = []
      results << payload["place_results"] if payload["place_results"].is_a?(Hash)
      results.concat(Array(payload["local_results"]))
      results = results.select { |item| item.is_a?(Hash) && address_of(item).present? }
      results.find { |item| title_matches?(item) } || results.first
    end

    def title_matches?(item)
      title = item["title"].to_s.downcase
      company = job.company_name.to_s.downcase
      return false if title.blank? || company.blank?

      title.include?(company) || company.include?(title) || significant_word(company) && title.include?(significant_word(company))
    end

    def significant_word(company)
      company.split.find { |word| word.length > 3 }
    end

    def address_of(item)
      item["address"].is_a?(String) ? item["address"].presence : nil
    end

    def attributes_for(listing)
      latitude = listing&.dig("gps_coordinates", "latitude")
      longitude = listing&.dig("gps_coordinates", "longitude")
      address = listing ? address_of(listing) : nil
      {
        company_name: job.company_name,
        search_location: job.location.to_s,
        place_name: listing&.[]("title").presence,
        address: address,
        latitude: latitude,
        longitude: longitude,
        maps_url: maps_url(latitude, longitude, address),
        found: address.present?
      }
    end

    def maps_url(latitude, longitude, address)
      return if address.blank? && latitude.blank?

      query = if latitude.present? && longitude.present?
        "#{latitude},#{longitude}"
      else
        address
      end
      "https://www.google.com/maps/search/?api=1&query=#{URI.encode_www_form_component(query)}"
    end
  end
end
