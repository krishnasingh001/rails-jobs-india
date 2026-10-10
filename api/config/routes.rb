Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :jobs, only: :index
      resources :resume_checks, only: %i[index show create destroy] do
        get :file, on: :member
      end
      post "resume_skills", to: "resume_skills#create"
      resource :profile, only: %i[show update]
      post "job_fit", to: "job_fits#create"
      get "place", to: "places#show"
      get "company_insight", to: "company_insights#show"
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get "auth/me", to: "auth#me"
      resources :tracked_applications, only: %i[index create destroy] do
        member do
          post :status
        end
      end
    end
  end
end
