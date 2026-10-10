require "test_helper"

class Resume::AiFluencyTest < ActiveSupport::TestCase
  test "finds nothing in a resume with no AI work" do
    assert_equal({ level: "none", signals: [] }, Resume::AiFluency.call("Rails, PostgreSQL, Sidekiq"))
  end

  test "treats AI tool use as the user level" do
    result = Resume::AiFluency.call("Daily use of GitHub Copilot and ChatGPT for code review.")

    assert_equal "user", result[:level]
    assert_includes result[:signals], "ChatGPT"
  end

  test "treats LLM API work as builder" do
    result = Resume::AiFluency.call("Built a support feature on the OpenAI API with embeddings.")

    assert_equal "builder", result[:level]
  end

  test "treats RAG and agents as expert" do
    result = Resume::AiFluency.call("Shipped a RAG pipeline and AI agents using pgvector.")

    assert_equal "expert", result[:level]
    assert_includes result[:signals], "RAG"
  end

  test "does not mistake a database cursor for the Cursor editor" do
    assert_equal "none", Resume::AiFluency.call("Used a database cursor for batching.")[:level]
  end
end
