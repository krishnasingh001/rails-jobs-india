class AddLogoDataToCompanies < ActiveRecord::Migration[8.0]
  def change
    add_column :companies, :logo_data, :binary
    add_column :companies, :logo_content_type, :string
  end
end
