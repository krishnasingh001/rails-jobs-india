module Api
  module V1
    # The signed-in candidate's resumes. Each job is scored against the one that fits it best.
    class UserResumesController < ApplicationController
      before_action :require_user!
      before_action :set_resume, only: %i[update destroy]

      def index
        render json: { data: UserResumeBlueprint.render_as_hash(current_user.user_resumes.order(:created_at, :id)) }
      end

      def create
        resume = current_user.user_resumes.build(resume_params)
        save(resume, status: :created)
      end

      def update
        @resume.assign_attributes(resume_params)
        save(@resume)
      end

      def destroy
        @resume.destroy!
        render json: { success: true }
      end

      private

      def save(resume, status: :ok)
        if resume.save
          render json: { success: true, data: UserResumeBlueprint.render_as_hash(resume) }, status: status
        else
          render json: {
            success: false,
            errors: resume.errors.full_messages,
            message: resume.errors.full_messages.to_sentence
          }, status: :unprocessable_entity
        end
      end

      def set_resume
        @resume = current_user.user_resumes.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { success: false, message: "Resume not found." }, status: :not_found
      end

      def resume_params
        permitted = params.permit(:label, :resume_url, :years_experience, :ai_fluency, skills: [], ai_signals: [])
        permitted[:years_experience] = nil if permitted.key?(:years_experience) && permitted[:years_experience].blank?
        permitted
      end
    end
  end
end
