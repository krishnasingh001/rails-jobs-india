require "test_helper"

class Serpapi::CompanyProfileTest < ActiveSupport::TestCase
  test "uses a real client when one is not passed in" do
    assert_instance_of Serpapi::Client, Serpapi::CompanyProfile.new("Cisco").send(:client)
  end

  test "reads a fenced answer after the first reply is not json" do
    result = Serpapi::CompanyProfile.call("Cisco", client: FlakyClient.new)

    assert_equal 1984, result.dig(:profile, "founded_year")
    assert_equal "Cisco", result[:company_name]
    assert_equal [ { "link" => "https://example.com" } ], result[:references]
  end

  test "reads json without a fence and json buried in prose" do
    plain = Serpapi::CompanyProfile.call("Plain", client: MarkdownClient.new('{"founded_year":2001}'))
    buried = Serpapi::CompanyProfile.call("Buried", client: MarkdownClient.new("Notes {\"founded_year\":2002} thanks"))
    fenced = Serpapi::CompanyProfile.call("Fenced", client: MarkdownClient.new("```\n{\"founded_year\":2003}\n```"))

    assert_equal [ 2001, 2002, 2003 ], [ plain, buried, fenced ].map { |result| result.dig(:profile, "founded_year") }
  end

  test "raises when Brave never returns json" do
    error = assert_raises(Serpapi::Error) do
      Serpapi::CompanyProfile.call("Cisco", client: MarkdownClient.new("no json here"))
    end

    assert_match(/Cisco/, error.message)
  end

  class FlakyClient
    def initialize
      @calls = 0
    end

    def brave_ai_mode(query:)
      @calls += 1
      if @calls == 1
        { "markdown" => "not json", "references" => [] }
      else
        { "markdown" => "```json\n{\"founded_year\":1984}\n```", "references" => [ { "link" => "https://example.com" } ] }
      end
    end
  end

  class MarkdownClient
    def initialize(markdown)
      @markdown = markdown
    end

    def brave_ai_mode(query:)
      { "markdown" => @markdown, "references" => [] }
    end
  end
end
