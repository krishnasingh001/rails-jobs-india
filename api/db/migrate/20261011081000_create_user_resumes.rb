class CreateUserResumes < ActiveRecord::Migration[8.0]
  def up
    create_table :user_resumes do |t|
      t.references :user, null: false, foreign_key: true
      t.string :label, null: false
      t.text :resume_url
      t.string :skills, array: true, default: [], null: false
      t.decimal :years_experience, precision: 4, scale: 1
      t.string :ai_fluency
      t.string :ai_signals, array: true, default: [], null: false
      t.timestamps
    end
    add_index :user_resumes, %i[user_id label], unique: true

    # Every existing profile becomes the user's first resume.
    execute <<~SQL
      INSERT INTO user_resumes (user_id, label, resume_url, skills, years_experience, ai_fluency, ai_signals, created_at, updated_at)
      SELECT id, 'My resume', resume_url, skills, years_experience, resume_ai_fluency, resume_ai_signals, NOW(), NOW()
      FROM users
      WHERE resume_url IS NOT NULL OR cardinality(skills) > 0
    SQL
  end

  def down
    drop_table :user_resumes
  end
end
