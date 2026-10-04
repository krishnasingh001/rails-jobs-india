class CreateCompanyPlaces < ActiveRecord::Migration[8.0]
  def change
    create_table :company_places do |t|
      t.string :company_name, null: false
      t.string :search_location, null: false, default: ""
      t.string :place_name
      t.text :address
      t.decimal :latitude, precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
      t.text :maps_url
      t.boolean :found, null: false, default: false

      t.timestamps
    end

    add_index :company_places, [ :company_name, :search_location ], unique: true
  end
end
