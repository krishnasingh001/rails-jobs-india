module Api
  module V1
    class AuthController < ApplicationController
      def register
        user = User.new(sign_up_params)
        if user.save
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
        role = params[:role].to_s
        role = "candidate" unless User::ROLES.include?(role)
        {
          name: params[:name],
          email: params[:email],
          password: params[:password],
          password_confirmation: params[:password_confirmation],
          role: role
        }
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
