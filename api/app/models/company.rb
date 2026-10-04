class Company < ApplicationRecord
  validates :company_name, presence: true, uniqueness: true
end
