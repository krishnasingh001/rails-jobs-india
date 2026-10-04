class CreateJobs < ActiveRecord::Migration[8.0]
  def change
    create_table :jobs do |t|
      t.string :external_id, null: false
      t.string :title, null: false
      t.string :company_name, null: false
      t.string :location, null: false, default: ""
      t.string :salary
      t.text :apply_url
      t.string :apply_host
      t.string :posted_label, null: false, default: ""
      t.text :description, null: false, default: ""
      t.string :via
      t.string :query
      t.string :search_location
      t.jsonb :raw, null: false, default: {}
      t.datetime :last_seen_at, null: false

      t.timestamps
    end

    add_index :jobs, :external_id, unique: true
    add_index :jobs, :last_seen_at

    create_table :serpapi_fetches do |t|
      t.datetime :fetched_at, null: false
      t.integer :job_count, null: false, default: 0

      t.timestamps
    end
  end
end
