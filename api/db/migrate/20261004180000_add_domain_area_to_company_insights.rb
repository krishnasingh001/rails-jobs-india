class AddDomainAreaToCompanyInsights < ActiveRecord::Migration[8.0]
  def change
    add_column :company_insights, :domain_area, :text
  end
end
