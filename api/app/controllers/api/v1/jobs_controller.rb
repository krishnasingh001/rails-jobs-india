module Api
  module V1
    class JobsController < ApplicationController
      # Read-only: HarvestJobsJob keeps the table fresh, never a visitor's request.
      def index
        render json: JobBlueprint.render_as_hash(Job.recent, root: :jobs)
      end
    end
  end
end
