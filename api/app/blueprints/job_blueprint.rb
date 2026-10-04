class JobBlueprint < Blueprinter::Base
  identifier :external_id, name: :id

  fields :title, :location

  field :company_name, name: :company
  field :salary
  field :apply_url, name: :applyUrl
  field :apply_host, name: :applyHost
  field :posted_label, name: :postedAt
end
