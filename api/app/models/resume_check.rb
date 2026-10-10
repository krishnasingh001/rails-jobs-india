class ResumeCheck < ApplicationRecord
  # Newest checks beyond this many are kept; older ones are removed along with their files.
  KEEP_PER_USER = 20
  LIST_COLUMNS = %i[id filename content_type byte_size target_role overall_score summary created_at].freeze

  belongs_to :user

  validates :filename, :content_type, :file_data, presence: true
  validates :overall_score, numericality: { in: 0..100 }

  scope :recent, -> { order(created_at: :desc, id: :desc) }
  scope :without_file, -> { select(*LIST_COLUMNS) }

  after_create_commit :prune_old

  private

  def prune_old
    stale = user.resume_checks.recent.offset(KEEP_PER_USER).pluck(:id)
    ResumeCheck.where(id: stale).delete_all if stale.any?
  end
end
