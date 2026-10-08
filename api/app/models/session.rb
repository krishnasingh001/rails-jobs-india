require "digest"

class Session < ApplicationRecord
  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true

  def self.start!(user)
    raw = SecureRandom.urlsafe_base64(32)
    create!(user: user, token_digest: digest(raw))
    raw
  end

  def self.authenticate(raw)
    return if raw.blank?

    find_by(token_digest: digest(raw))&.user
  end

  def self.digest(raw)
    Digest::SHA256.hexdigest(raw.to_s)
  end
end
