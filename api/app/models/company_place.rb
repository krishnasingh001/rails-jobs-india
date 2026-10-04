class CompanyPlace < ApplicationRecord
  validates :company_name, presence: true
  validates :company_name, uniqueness: { scope: :search_location }
end
