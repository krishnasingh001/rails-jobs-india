module Api
  module V1
    class JobsController < ApplicationController
      def index
        result = Serpapi::Harvest.call(force: refresh?)
        render json: JobBlueprint.render_as_hash(result.jobs, root: :jobs)
      rescue Serpapi::Error => error
        jobs = Job.recent
        if jobs.any?
          render json: JobBlueprint.render_as_hash(jobs, root: :jobs)
        else
          render json: { error: error.message }, status: :bad_gateway
        end
      end

      private

      def refresh?
        ActiveModel::Type::Boolean.new.cast(params[:refresh])
      end
    end
  end
end
