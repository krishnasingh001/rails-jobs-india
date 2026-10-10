module Api
  module V1
    class AuthController < ApplicationController
      def register
        user = User.new(sign_up_params)
        if user.save
          create_first_resume(user)
          render json: session_payload(user, "Account created. You are signed in."), status: :created
        else
          render json: {
            success: false,
            errors: user.errors.full_messages,
            message: user.errors.full_messages.presence&.join(" ") || "Could not create your account."
          }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by(email: params[:email].to_s.strip.downcase)
        if user&.authenticate(params[:password].to_s)
          render json: session_payload(user, "Signed in successfully.")
        else
          render json: { success: false, message: "Invalid email or password." }, status: :unauthorized
        end
      end

      def logout
        token = bearer_token
        if token.present?
          Session.find_by(token_digest: Session.digest(token))&.destroy
        end
        render json: { success: true }
      end

      def me
        render json: { user: current_user ? UserBlueprint.render_as_hash(current_user) : nil }
      end

      private

      def sign_up_params
        {
          name: params[:name],
          email: params[:email],
          password: params[:password],
          password_confirmation: params[:password_confirmation],
          resume_url: params[:resume_url],
          skills: params[:skills].is_a?(Array) ? params[:skills].select { |skill| skill.is_a?(String) } : [],
          years_experience: params[:years_experience].presence,
          resume_ai_fluency: User::AI_LEVELS.include?(params[:resume_ai_fluency].to_s) ? params[:resume_ai_fluency] : nil,
          resume_ai_signals: params[:resume_ai_signals].is_a?(Array) ? params[:resume_ai_signals].select { |s| s.is_a?(String) }.first(8) : []
        }
      end

      # What the sign-up resume yielded becomes the user's first resume.
      def create_first_resume(user)
        return if user.resume_url.blank? && user.skills.empty?

        user.user_resumes.create(
          label: "My resume", resume_url: user.resume_url, skills: user.skills,
          years_experience: user.years_experience, ai_fluency: user.resume_ai_fluency, ai_signals: user.resume_ai_signals
        )
      end

      def session_payload(user, message)
        {
          success: true,
          requires_confirmation: false,
          message: message,
          user: UserBlueprint.render_as_hash(user),
          auth_token: Session.start!(user),
          redirect_to: "/"
        }
      end
    end
  end
end
