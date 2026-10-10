class AddResumeProfileToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :resume_url, :string
    add_column :users, :skills, :string, array: true, default: [], null: false
  end
end
