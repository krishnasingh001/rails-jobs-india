module Api
  module V1
    class HarvestsController < ApplicationController
      def create
        result = Serpapi::Harvest.call(force: true)
        render json: {
          jobs: JobBlueprint.render_as_hash(result.jobs),
          added: result.added
        }
      rescue Serpapi::Error => error
        render json: { error: error.message }, status: :bad_gateway
      end
    end
  end
end
