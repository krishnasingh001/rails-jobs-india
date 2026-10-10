class User < ApplicationRecord
  has_secure_password

  ROLES = %w[candidate recruiter].freeze

  FREE_EMAIL_DOMAINS = %w[
    gmail.com googlemail.com
    yahoo.com yahoo.co.in yahoo.co.uk ymail.com
    hotmail.com hotmail.co.uk
    outlook.com live.com msn.com
    icloud.com me.com mac.com
    proton.me protonmail.com
    aol.com
    zoho.com zohomail.com
    gmx.com gmx.net
    mail.com
    yandex.com yandex.ru
    rediffmail.com
    inbox.com
  ].freeze

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
  validate :recruiter_must_use_business_email, if: :recruiter?

  def recruiter?
    role == "recruiter"
  end

  def self.free_email_domain?(email)
    domain = email.to_s.strip.downcase.split("@").last
    domain.present? && FREE_EMAIL_DOMAINS.include?(domain)
  end

  private

  def normalize_resume_profile
    self.resume_url = resume_url.to_s.strip.presence
    self.skills = Array(skills).map { |skill| skill.to_s.squish }.reject(&:blank?).uniq(&:downcase)
  end

  def resume_url_must_be_http
    return if resume_url.blank?

    uri = URI.parse(resume_url)
    errors.add(:resume_url, "must be a valid http or https link") unless uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    errors.add(:resume_url, "must be a valid http or https link")
  end

  def skills_are_reasonable
    errors.add(:skills, "can include at most 40 entries") if skills.size > 40
    errors.add(:skills, "must be 40 characters or fewer each") if skills.any? { |skill| skill.length > 40 }
  end

  def normalize_email
    self.email = email.to_s.strip.downcase
  end

  def recruiter_must_use_business_email
    return if email.blank?
    return unless self.class.free_email_domain?(email)

    errors.add(:email, "must be a business email address. Personal email providers (Gmail, Yahoo, Outlook, etc.) are not allowed for recruiter accounts.")
  end
end
