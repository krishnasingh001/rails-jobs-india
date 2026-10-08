# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_10_04_210000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "companies", force: :cascade do |t|
    t.string "company_name", null: false
    t.text "logo"
    t.integer "job_count", default: 0, null: false
    t.jsonb "states", default: [], null: false
    t.jsonb "locations", default: [], null: false
    t.jsonb "via_sources", default: [], null: false
    t.jsonb "job_ids", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_name"], name: "index_companies_on_company_name", unique: true
  end

  create_table "company_insights", force: :cascade do |t|
    t.string "company_name", null: false
    t.text "query"
    t.datetime "fetched_at"
    t.text "markdown"
    t.jsonb "references", default: [], null: false
    t.jsonb "text_blocks", default: [], null: false
    t.jsonb "related_questions", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "profile", default: {}, null: false
    t.text "domain_area"
    t.index ["company_name"], name: "index_company_insights_on_company_name", unique: true
  end

  create_table "company_places", force: :cascade do |t|
    t.string "company_name", null: false
    t.string "search_location", default: "", null: false
    t.string "place_name"
    t.text "address"
    t.decimal "latitude", precision: 10, scale: 6
    t.decimal "longitude", precision: 10, scale: 6
    t.text "maps_url"
    t.boolean "found", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_name", "search_location"], name: "index_company_places_on_company_name_and_search_location", unique: true
  end

  create_table "jobs", force: :cascade do |t|
    t.string "external_id", null: false
    t.string "title", null: false
    t.string "company_name", null: false
    t.string "location", default: "", null: false
    t.string "salary"
    t.text "apply_url"
    t.string "apply_host"
    t.string "posted_label", default: "", null: false
    t.text "description", default: "", null: false
    t.string "via"
    t.string "query"
    t.string "search_location"
    t.jsonb "raw", default: {}, null: false
    t.datetime "last_seen_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "state"
    t.index ["external_id"], name: "index_jobs_on_external_id", unique: true
    t.index ["last_seen_at"], name: "index_jobs_on_last_seen_at"
    t.index ["state"], name: "index_jobs_on_state"
  end

  create_table "search_cursors", force: :cascade do |t|
    t.string "query", null: false
    t.string "location", null: false
    t.text "next_page_token"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["query", "location"], name: "index_search_cursors_on_query_and_location", unique: true
  end

  create_table "serpapi_fetches", force: :cascade do |t|
    t.datetime "fetched_at", null: false
    t.integer "job_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "tracked_applications", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "job_external_id", null: false
    t.string "job_title", null: false
    t.string "company_name", null: false
    t.text "job_url"
    t.string "location", default: "", null: false
    t.string "status", default: "applied", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "job_external_id"], name: "index_tracked_applications_on_user_id_and_job_external_id", unique: true
    t.index ["user_id"], name: "index_tracked_applications_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "role", default: "candidate", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "sessions", "users"
  add_foreign_key "tracked_applications", "users"
end
