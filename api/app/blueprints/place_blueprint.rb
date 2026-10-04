class PlaceBlueprint < Blueprinter::Base
  field :place_name, name: :name
  field :address

  field :latitude do |place|
    place.latitude&.to_f
  end

  field :longitude do |place|
    place.longitude&.to_f
  end

  field :maps_url, name: :mapsUrl
end
