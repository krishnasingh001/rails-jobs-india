class AddJobPreferencesToUsers < ActiveRecord::Migration[8.0]
  def change
    change_table :users, bulk: true do |t|
      t.string :preferred_cities, array: true, default: [], null: false
      t.string :work_modes, array: true, default: [], null: false
      t.integer :expected_salary_lpa
      t.decimal :years_experience, precision: 4, scale: 1
      t.string :ai_fluency
      t.string :resume_ai_fluency
      t.string :resume_ai_signals, array: true, default: [], null: false
    end
  end
end
