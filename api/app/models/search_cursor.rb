class SearchCursor < ApplicationRecord
  validates :query, :location, presence: true
  validates :query, uniqueness: { scope: :location }
end
