module Api
  module V1
    # Read-only. The JSON profile for a company is used when the file exists.
    # Otherwise the stored row is returned. No metered request is made.
    class CompanyInsightsController < ApplicationController
      def show
        insight = CompanyProfileLookup.find(params[:company])
        render json: { insight: insight ? CompanyInsightBlueprint.render_as_hash(insight) : nil }
      end
    end
  end
end
