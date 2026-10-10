module Resume
  # Looks for AI-related work in resume text, without calling an AI.
  # It counts concrete signals; it does not test what the candidate can actually do.
  #   none    - nothing AI-related found
  #   user    - uses AI tools such as ChatGPT, Copilot or Claude
  #   builder - has built features on LLM APIs or ML tooling
  #   expert  - mentions advanced work such as RAG, agents, evals or fine-tuning
  class AiFluency
    LEVELS = %w[none user builder expert].freeze

    TOOLS = {
      "ChatGPT" => %w[chatgpt], "GitHub Copilot" => [ "copilot", "github copilot" ], "Claude" => [ "claude", "claude code" ],
      "Gemini" => %w[gemini], "Cursor" => [ "cursor ide", "cursor ai", "cursor editor", "cursor.sh" ], "Windsurf" => %w[windsurf],
      "AI coding assistants" => [ "ai assistant", "ai assistants", "ai-assisted", "ai assisted", "ai pair programming", "ai tools", "ai-powered tools" ],
      "Prompt engineering" => [ "prompt engineering", "prompting", "prompt design" ],
      "Generative AI" => [ "generative ai", "genai", "gen ai" ]
    }.freeze

    BUILDING = {
      "LLM APIs" => [ "openai api", "openai", "anthropic", "gpt-4", "gpt-4o", "llm", "llms", "large language model", "large language models" ],
      "Embeddings & vector search" => [ "embedding", "embeddings", "vector database", "vector search", "pgvector", "pinecone", "weaviate" ],
      "LangChain / LlamaIndex" => [ "langchain", "llamaindex", "llama index" ],
      "Ruby AI libraries" => [ "ruby-openai", "ruby_llm", "langchainrb", "ruby openai" ],
      "Function calling" => [ "function calling", "tool calling" ],
      "Chatbots" => [ "chatbot", "chatbots", "conversational ai" ],
      "Machine learning" => [ "machine learning", "tensorflow", "pytorch", "scikit-learn", "hugging face", "huggingface" ]
    }.freeze

    ADVANCED = {
      "RAG" => [ "rag", "retrieval augmented generation", "retrieval-augmented generation" ],
      "AI agents" => [ "ai agent", "ai agents", "llm agent", "llm agents", "agentic", "multi-agent" ],
      "MCP" => [ "mcp", "model context protocol" ],
      "Fine-tuning" => [ "fine-tuning", "fine tuning", "fine-tuned", "finetuning" ],
      "LLM evals" => [ "llm evaluation", "llm evals", "evals", "model evaluation" ]
    }.freeze

    def self.call(text)
      new(text).call
    end

    def self.compile(table)
      table.map do |name, terms|
        [ name, /(?<![\p{L}\p{N}])(?:#{terms.map { |t| Regexp.escape(t) }.join('|')})(?![\p{L}\p{N}])/i ]
      end
    end

    TOOL_PATTERNS = compile(TOOLS)
    BUILDING_PATTERNS = compile(BUILDING)
    ADVANCED_PATTERNS = compile(ADVANCED)

    def initialize(text)
      @text = text.to_s
    end

    def call
      tools = found(TOOL_PATTERNS)
      building = found(BUILDING_PATTERNS)
      advanced = found(ADVANCED_PATTERNS)

      level =
        if advanced.size >= 2 || (advanced.any? && building.any?) then "expert"
        elsif building.any? || advanced.any? then "builder"
        elsif tools.any? then "user"
        else "none"
        end

      { level: level, signals: (advanced + building + tools).first(8) }
    end

    private

    attr_reader :text

    def found(patterns)
      patterns.filter_map { |name, pattern| name if text.match?(pattern) }
    end
  end
end
