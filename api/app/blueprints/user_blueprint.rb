class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :email, :role, :resume_url, :skills
end
