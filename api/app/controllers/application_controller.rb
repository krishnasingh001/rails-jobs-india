class ApplicationController < ActionController::API
  private

  def bearer_token
    request.authorization.to_s.delete_prefix("Bearer ").strip
  end

  def current_user
    @current_user ||= Session.authenticate(bearer_token)
  end

  def require_user!
    return if current_user

    render json: { success: false, message: "Please sign in to continue." }, status: :unauthorized
  end
end
