class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :email, :role, :resume_url, :skills,
         :preferred_cities, :work_modes, :expected_salary_lpa, :ai_fluency,
         :resume_ai_fluency, :resume_ai_signals, :avatar

  field :years_experience do |user|
    user.years_experience&.to_f
  end
end
