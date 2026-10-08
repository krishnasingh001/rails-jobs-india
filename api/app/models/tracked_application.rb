class TrackedApplication < ApplicationRecord
  STATUSES = %w[applied screening interview offered rejected withdrawn].freeze

  STATUS_LABELS = {
    "applied" => "Applied",
    "screening" => "Screening",
    "interview" => "Interview",
    "offered" => "Offered",
    "rejected" => "Rejected",
    "withdrawn" => "Withdrawn"
  }.freeze

  belongs_to :user

  validates :job_external_id, :job_title, :company_name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :job_external_id, uniqueness: { scope: :user_id }

  scope :recent, -> { order(updated_at: :desc) }
end
