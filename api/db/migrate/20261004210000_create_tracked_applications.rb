class CreateTrackedApplications < ActiveRecord::Migration[8.0]
  def change
    create_table :tracked_applications do |t|
      t.references :user, null: false, foreign_key: true
      t.string :job_external_id, null: false
      t.string :job_title, null: false
      t.string :company_name, null: false
      t.text :job_url
      t.string :location, default: "", null: false
      t.string :status, default: "applied", null: false

      t.timestamps
    end

    add_index :tracked_applications, [ :user_id, :job_external_id ], unique: true
  end
end