require "test_helper"
require "fileutils"
require "tmpdir"

class CompanyProfileLookupTest < ActiveSupport::TestCase
  test "returns nil for a blank name and ignores files that are not usable profiles" do
    with_profiles do |dir|
      File.write(dir.join("bad.json"), "{")
      File.write(dir.join("list.json"), "[]")
      File.write(dir.join("blank-name.json"), JSON.generate({ "company_name" => "  ", "profile" => { "head_count" => "1" } }))
      File.write(dir.join("text-profile.json"), JSON.generate({ "company_name" => "Text", "profile" => "just words" }))
      File.write(dir.join("empty.json"), JSON.generate({ "company_name" => "Empty", "profile" => {} }))
      File.write(dir.join("ok.json"), JSON.generate({
        "company_name" => "Ok Co",
        "profile" => { "head_count" => "10" },
        "references" => [ { "title" => "Site", "link" => "https://ok.example" } ]
      }))

      assert_nil CompanyProfileLookup.find("  ")
      assert_nil CompanyProfileLookup.find("Empty")
      insight = CompanyProfileLookup.find("ok co")
      assert_equal "10", insight.profile["head_count"]
      assert_equal [ { "title" => "Site", "link" => "https://ok.example" } ], insight.profile_references
      assert_nil insight.profile_fetched_at
    end
  end

  test "uses the database when no json file matches" do
    with_profiles do
      CompanyInsight.create!(company_name: "Only Stored", profile: { "head_count" => "from the database" })

      insight = CompanyProfileLookup.find("only stored")

      assert_equal "from the database", insight.profile["head_count"]
      assert_nil CompanyProfileLookup.find("Missing")
    end
  end

  test "returns nil when the profile directory is missing" do
    swap_dir(Rails.root.join("tmp/missing-company-profiles-#{Process.pid}")) do
      assert_nil CompanyProfileLookup.find("Cisco")
    end
  end

  private

  def with_profiles
    swap_dir(Pathname(Dir.mktmpdir)) { |dir| yield dir }
  end

  def swap_dir(dir)
    original = nil
    original = CompanyProfileLookup::DIR
    CompanyProfileLookup.send(:remove_const, :DIR)
    CompanyProfileLookup.const_set(:DIR, dir)
    yield dir
  ensure
    if original
      CompanyProfileLookup.send(:remove_const, :DIR) if CompanyProfileLookup.const_defined?(:DIR, false)
      CompanyProfileLookup.const_set(:DIR, original)
    end
    FileUtils.remove_entry(dir) if dir && File.exist?(dir.to_s) && dir.to_s != Rails.root.join("data/company_profiles").to_s
  end
end
