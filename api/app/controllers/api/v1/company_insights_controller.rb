module Api
  module V1
    # Read-only: serves the stored Brave AI Mode profile, so every job of a company
    # shares one profile and no metered request is made.
    class CompanyInsightsController < ApplicationController
      def show
        name = params[:company].to_s.strip
        insight = CompanyInsight.where.not(profile: {}).find_by("lower(company_name) = ?", name.downcase)
        render json: { insight: insight ? CompanyInsightBlueprint.render_as_hash(insight) : nil }
      end
    end
  end
end
