module Api
  module V1
    class PlacesController < ApplicationController
      def show
        job = Job.find_by!(external_id: params[:job_id])
        place = Serpapi::PlaceLookup.call(job)
        render json: { place: place.found? ? PlaceBlueprint.render_as_hash(place) : nil }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "That job is not on the map." }, status: :not_found
      rescue Serpapi::Error => error
        render json: { error: error.message }, status: :bad_gateway
      end
    end
  end
end
