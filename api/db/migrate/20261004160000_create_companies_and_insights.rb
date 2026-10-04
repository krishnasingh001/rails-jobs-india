class CreateCompaniesAndInsights < ActiveRecord::Migration[8.0]
  def change
    add_column :jobs, :state, :string
    add_index :jobs, :state

    create_table :companies do |t|
      t.string :company_name, null: false
      t.text :logo
      t.integer :job_count, null: false, default: 0
      t.jsonb :states, null: false, default: []
      t.jsonb :locations, null: false, default: []
      t.jsonb :via_sources, null: false, default: []
      t.jsonb :job_ids, null: false, default: []

      t.timestamps
    end
    add_index :companies, :company_name, unique: true

    create_table :company_insights do |t|
      t.string :company_name, null: false
      t.text :query
      t.datetime :fetched_at
      t.text :markdown
      t.jsonb :references, null: false, default: []
      t.jsonb :text_blocks, null: false, default: []
      t.jsonb :related_questions, null: false, default: []

      t.timestamps
    end
    add_index :company_insights, :company_name, unique: true
  end
end
