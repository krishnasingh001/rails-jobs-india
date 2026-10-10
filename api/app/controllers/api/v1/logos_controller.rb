module Api
  module V1
    # Serves a company logo from the database. Each URL carries a version,
    # so browsers can keep the image for a long time.
    class LogosController < ApplicationController
      def show
        company = Company.where.not(logo_data: nil).find(params[:id])
        expires_in 1.year, public: true
        send_data company.logo_data, type: company.logo_content_type, disposition: "inline"
      end
    end
  end
end
