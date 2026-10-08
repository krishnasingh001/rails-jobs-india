class TrackedApplicationBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :location

  field :job_title, name: :jobTitle
  field :company_name, name: :company
  field :job_url, name: :jobUrl
  field :created_at, name: :createdAt

  field :statusDisplay do |application|
    TrackedApplication::STATUS_LABELS[application.status]
  end
end
