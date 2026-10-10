class AddProfileProvenanceToCompanyInsights < ActiveRecord::Migration[8.0]
  def change
    add_column :company_insights, :profile_references, :jsonb, default: [], null: false
    add_column :company_insights, :profile_fetched_at, :datetime
  end
end
