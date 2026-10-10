module Api
  module V1
    # Scores how well the signed-in candidate's skills cover what a job description asks for.
    # Anyone can read the skills a posting asks for; the score needs a signed-in candidate with saved skills.
    class JobFitsController < ApplicationController
      def create
        fit = Resume::JobFit.call(
          description: params[:description].to_s.first(20_000),
          title: params[:title].to_s.first(300),
          skills: current_user&.skills || []
        )
        latest = current_user&.resume_checks&.recent&.first

        render json: {
          success: true,
          data: fit.merge(
            signed_in: current_user.present?,
            has_skills: current_user&.skills.present?,
            ats_score: latest&.overall_score,
            ats_check_id: latest&.id
          )
        }
      end
    end
  end
end
