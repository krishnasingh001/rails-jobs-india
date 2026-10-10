require "test_helper"
require "fileutils"
require "tmpdir"

class DataImportTest < ActiveSupport::TestCase
  test "loads jobs, companies, insights and profiles from the fixture files" do
    with_fixture_data do
      counts = DataImport.call

      assert_equal 2, counts[:jobs]
      assert_equal 2, counts[:companies]
      assert_equal 2, counts[:company_insights]
      assert_equal 2, counts[:company_profiles]

      job = Job.find_by!(external_id: "job-fixture-1")
      assert_equal "Pune", job.state
      assert_equal "2026-10-04T08:00:00Z", job.last_seen_at.utc.iso8601
      assert_nil Job.find_by(external_id: "")

      undated = Job.find_by!(external_id: "job-fixture-2")
      assert_equal "India", undated.state
      assert undated.last_seen_at.present?

      acme = Company.find_by!(company_name: "Acme")
      assert_equal [ "Pune" ], acme.states
      assert_equal [ "image/png", "acme-logo-bytes" ], [ acme.logo_content_type, acme.logo_data ]
      assert_nil Company.find_by!(company_name: "Bare Co").logo_data
      assert_equal [], Company.find_by!(company_name: "Bare Co").states

      insight = CompanyInsight.find_by!(company_name: "Acme")
      assert_equal "Software", insight.domain_area
      assert_equal [ { "title" => "About", "link" => "https://acme.example/about" } ], insight.profile_references
      assert_equal({}, CompanyInsight.find_by!(company_name: "Bare Profile").profile)
      assert_equal [], CompanyInsight.find_by!(company_name: "Bare Insight").references
    end
  end

  test "importing again does not overwrite a listing that is already stored" do
    with_fixture_data do |dir|
      DataImport.call
      file = dir.join("jobs/pune.json")
      payload = JSON.parse(file.read)
      payload["jobs"].first["title"] = "Changed title"
      payload["state"] = "Maharashtra"
      file.write(JSON.generate(payload))

      DataImport.call

      job = Job.find_by!(external_id: "job-fixture-1")
      assert_equal "Rails Dev", job.title
      assert_equal "Maharashtra", job.state
      assert_equal 2, Job.count
    end
  end

  private

  def with_fixture_data
    dir = nil
    original = nil
    dir = Pathname(Dir.mktmpdir)
    FileUtils.cp_r(Rails.root.join("test/fixtures/data_import/."), dir)
    original = DataImport::DATA_DIR
    DataImport.send(:remove_const, :DATA_DIR)
    DataImport.const_set(:DATA_DIR, dir)
    yield dir
  ensure
    if original
      DataImport.send(:remove_const, :DATA_DIR) if DataImport.const_defined?(:DATA_DIR, false)
      DataImport.const_set(:DATA_DIR, original)
    end
    FileUtils.remove_entry(dir) if dir
  end
end
