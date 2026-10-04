class SerpapiFetch < ApplicationRecord
  validates :fetched_at, presence: true
  validates :job_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
