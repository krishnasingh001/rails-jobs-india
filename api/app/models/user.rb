class User < ApplicationRecord
  has_secure_password

  ROLES = %w[candidate].freeze
  WORK_MODES = %w[remote hybrid onsite].freeze
  AI_LEVELS = Resume::AiFluency::LEVELS

  has_many :sessions, dependent: :destroy
  has_many :tracked_applications, dependent: :destroy
  has_many :resume_checks, dependent: :destroy

  before_validation :normalize_email
  before_validation :normalize_resume_profile

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: 6 }, if: -> { password.present? }
  validates :resume_url, length: { maximum: 500 }, allow_blank: true
  validate :resume_url_must_be_http
  validate :skills_are_reasonable
  validate :preferences_are_reasonable
  validate :avatar_is_a_small_image

  private

  def normalize_resume_profile
    self.resume_url = resume_url.to_s.strip.presence
    self.preferred_cities = Array(preferred_cities).map { |city| city.to_s.squish }.reject(&:blank?).uniq(&:downcase)
    self.work_modes = Array(work_modes).map { |mode| mode.to_s.downcase }.uniq
    self.ai_fluency = ai_fluency.presence
    self.avatar = avatar.presence
    self.skills = Array(skills).map { |skill| skill.to_s.squish }.reject(&:blank?).uniq(&:downcase)
  end

  def resume_url_must_be_http
    return if resume_url.blank?

    uri = URI.parse(resume_url)
    errors.add(:resume_url, "must be a valid http or https link") unless uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    errors.add(:resume_url, "must be a valid http or https link")
  end

  AVATAR_FORMAT = %r{\Adata:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}\z}
  AVATAR_MAX_CHARS = 200_000

  def avatar_is_a_small_image
    return if avatar.blank?

    errors.add(:avatar, "must be a JPEG, PNG or WebP image") unless avatar.match?(AVATAR_FORMAT)
    errors.add(:avatar, "is too large, choose a smaller photo") if avatar.length > AVATAR_MAX_CHARS
  end

  def preferences_are_reasonable
    errors.add(:preferred_cities, "can include at most 10 cities") if preferred_cities.size > 10
    errors.add(:preferred_cities, "must be 60 characters or fewer each") if preferred_cities.any? { |city| city.length > 60 }
    errors.add(:work_modes, "can only be remote, hybrid or onsite") unless (work_modes - WORK_MODES).empty?
    errors.add(:expected_salary_lpa, "must be between 1 and 1000 lakh per year") if expected_salary_lpa && !expected_salary_lpa.between?(1, 1000)
    errors.add(:years_experience, "must be between 0 and 50") if years_experience && !years_experience.between?(0, 50)
    errors.add(:ai_fluency, "is not a known level") if ai_fluency && !AI_LEVELS.include?(ai_fluency)
  end

  def skills_are_reasonable
    errors.add(:skills, "can include at most 40 entries") if skills.size > 40
    errors.add(:skills, "must be 40 characters or fewer each") if skills.any? { |skill| skill.length > 40 }
  end

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
