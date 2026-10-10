class ResumeCheckBlueprint < Blueprinter::Base
  identifier :id

  fields :filename, :byte_size, :target_role, :overall_score, :summary, :created_at

  view :detailed do
    field(:report) { |check| check.report }
  end
end
