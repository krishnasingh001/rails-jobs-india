class Job < ApplicationRecord
  validates :external_id, :title, :company_name, :last_seen_at, presence: true
  validates :external_id, uniqueness: true

  # Loads the company without its logo bytes; the logo endpoint serves those.
  belongs_to :company, -> { select(:id, :company_name, :logo_content_type, :updated_at) },
    foreign_key: :company_name, primary_key: :company_name, optional: true

  scope :recent, -> { order(last_seen_at: :desc, id: :desc) }
end
