class AddProfileToCompanyInsights < ActiveRecord::Migration[8.0]
  def change
    add_column :company_insights, :profile, :jsonb, null: false, default: {}
  end
end
