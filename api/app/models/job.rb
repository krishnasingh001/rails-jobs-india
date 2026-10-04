class Job < ApplicationRecord
  validates :external_id, :title, :company_name, :last_seen_at, presence: true
  validates :external_id, uniqueness: true

  scope :recent, -> { order(last_seen_at: :desc, id: :desc) }
end
