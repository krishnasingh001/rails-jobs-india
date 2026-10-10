# One of a candidate's resumes. Holds what was read from the file, so each job can be scored against the resume that fits it best.
class UserResume < ApplicationRecord
  MAX_PER_USER = 5

  belongs_to :user

  before_validation :normalize

  validates :label, presence: true, length: { maximum: 40 }, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :resume_url, length: { maximum: 500 }, allow_blank: true
  validates :years_experience, numericality: { in: 0..50 }, allow_nil: true
  validates :ai_fluency, inclusion: { in: User::AI_LEVELS }, allow_nil: true
  validate :skills_are_reasonable
  validate :user_is_under_the_limit, on: :create

  private

  def normalize
    self.label = label.to_s.squish
    self.resume_url = resume_url.to_s.strip.presence
    self.ai_fluency = ai_fluency.presence
    self.skills = Array(skills).map { |skill| skill.to_s.squish }.reject(&:blank?).uniq(&:downcase)
    self.ai_signals = Array(ai_signals).map { |signal| signal.to_s.squish }.reject(&:blank?).first(8)
  end

  def skills_are_reasonable
    errors.add(:skills, "can include at most 40 entries") if skills.size > 40
    errors.add(:skills, "must be 40 characters or fewer each") if skills.any? { |skill| skill.length > 40 }
  end

  def user_is_under_the_limit
    errors.add(:base, "You can keep at most #{MAX_PER_USER} resumes") if user && user.user_resumes.count >= MAX_PER_USER
  end
end
