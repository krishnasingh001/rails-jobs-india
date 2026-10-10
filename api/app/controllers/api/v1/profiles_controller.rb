module Api
  module V1
    # The signed-in candidate's job preferences and resume-derived profile.
    class ProfilesController < ApplicationController
      before_action :require_user!

      def show
        render json: { user: UserBlueprint.render_as_hash(current_user) }
      end

      def update
        if current_user.update(profile_params)
          render json: { success: true, user: UserBlueprint.render_as_hash(current_user) }
        else
          render json: {
            success: false,
            errors: current_user.errors.full_messages,
            message: current_user.errors.full_messages.join(" ")
          }, status: :unprocessable_entity
        end
      end

      private

      def profile_params
        permitted = params.permit(
          :resume_url, :avatar, :expected_salary_lpa, :years_experience, :ai_fluency,
          :resume_ai_fluency, skills: [], preferred_cities: [], work_modes: [], resume_ai_signals: []
        )
        permitted[:expected_salary_lpa] = nil if permitted.key?(:expected_salary_lpa) && permitted[:expected_salary_lpa].blank?
        permitted[:years_experience] = nil if permitted.key?(:years_experience) && permitted[:years_experience].blank?
        permitted
      end
    end
  end
end
