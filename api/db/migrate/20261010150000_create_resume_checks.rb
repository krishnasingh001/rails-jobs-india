class CreateResumeChecks < ActiveRecord::Migration[8.0]
  def change
    create_table :resume_checks do |t|
      t.references :user, null: false, foreign_key: true
      t.string :filename, null: false
      t.string :content_type, null: false
      t.integer :byte_size, null: false
      t.binary :file_data, null: false
      t.string :target_role
      t.integer :overall_score, null: false
      t.string :summary
      t.jsonb :report, null: false, default: {}
      t.timestamps
    end
    add_index :resume_checks, %i[user_id created_at]
  end
end
