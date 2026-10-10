class UserResumeBlueprint < Blueprinter::Base
  identifier :id

  fields :label, :skills
  field :resume_url
  field :ai_fluency
  field :ai_signals

  field :years_experience do |resume|
    resume.years_experience&.to_f
  end
end
