module Api
  module V1
    class TrackedApplicationsController < ApplicationController
      before_action :require_user!
      before_action :set_application, only: %i[status destroy]

      def index
        apps = current_user.tracked_applications.recent
        data = TrackedApplication::STATUSES.index_with do |status|
          TrackedApplicationBlueprint.render_as_hash(apps.select { |application| application.status == status })
        end
        render json: { data: data }
      end

      def create
        existing = current_user.tracked_applications.find_by(job_external_id: application_params[:job_external_id])
        if existing
          return render json: {
            success: true,
            message: "Already tracking this job.",
            data: TrackedApplicationBlueprint.render_as_hash(existing),
            meta: { alreadyTracked: true }
          }
        end

        application = current_user.tracked_applications.build(application_params)
        application.status = "applied"
        if application.save
          render json: {
            success: true,
            message: "Application tracked.",
            data: TrackedApplicationBlueprint.render_as_hash(application)
          }, status: :created
        else
          render json: {
            success: false,
            message: application.errors.full_messages.to_sentence.presence || "Could not track application.",
            errors: application.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def status
        next_status = params[:status].to_s
        unless TrackedApplication::STATUSES.include?(next_status)
          return render json: { success: false, message: "Invalid status." }, status: :unprocessable_entity
        end

        if @application.update(status: next_status)
          render json: { success: true, data: TrackedApplicationBlueprint.render_as_hash(@application) }
        else
          render json: { success: false, message: "Could not update this application." }, status: :unprocessable_entity
        end
      end

      def destroy
        @application.destroy!
        render json: { success: true, message: "Application removed." }
      end

      private

      def set_application
        @application = current_user.tracked_applications.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { success: false, message: "Application not found." }, status: :not_found
      end

      def application_params
        params.permit(:job_external_id, :job_title, :company_name, :job_url, :location)
      end
    end
  end
end
