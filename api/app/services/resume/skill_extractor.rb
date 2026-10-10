module Resume
  # Finds known technical skills in resume text. Matching is whole-word and case-insensitive;
  # each skill is returned once, under its display name, in the order it first appears.
  class SkillExtractor
    SKILLS = {
      "Ruby" => %w[ruby], "Ruby on Rails" => [ "ruby on rails", "rails", "ror" ], "Sinatra" => %w[sinatra],
      "Hotwire" => %w[hotwire], "Turbo" => %w[turbo], "Stimulus" => %w[stimulus],
      "ActiveRecord" => %w[activerecord active\ record], "Sidekiq" => %w[sidekiq], "Resque" => %w[resque],
      "RSpec" => %w[rspec], "Minitest" => %w[minitest], "Capybara" => %w[capybara], "FactoryBot" => %w[factorybot factory_bot],
      "Devise" => %w[devise], "Pundit" => %w[pundit], "GraphQL" => %w[graphql], "REST APIs" => [ "rest api", "rest apis", "restful", "rest" ],
      "PostgreSQL" => %w[postgresql postgres psql], "MySQL" => %w[mysql], "SQLite" => %w[sqlite], "MongoDB" => %w[mongodb mongo],
      "Redis" => %w[redis], "Elasticsearch" => %w[elasticsearch opensearch], "Kafka" => %w[kafka], "RabbitMQ" => %w[rabbitmq],
      "JavaScript" => %w[javascript js], "TypeScript" => %w[typescript], "React" => [ "react", "reactjs", "react.js" ],
      "Vue" => [ "vue", "vue.js" ], "Node.js" => [ "node.js", "nodejs", "node" ], "HTML" => %w[html html5], "CSS" => %w[css css3],
      "Tailwind CSS" => [ "tailwind", "tailwindcss" ], "Python" => %w[python], "Go" => [ "golang" ], "Java" => %w[java], "Elixir" => %w[elixir],
      "Docker" => %w[docker], "Kubernetes" => %w[kubernetes k8s], "AWS" => %w[aws], "GCP" => [ "gcp", "google cloud" ], "Azure" => %w[azure],
      "Heroku" => %w[heroku], "Terraform" => %w[terraform], "Linux" => %w[linux], "Nginx" => %w[nginx], "Puma" => %w[puma],
      "CI/CD" => [ "ci/cd", "ci cd", "github actions", "circleci", "jenkins", "gitlab ci" ], "Git" => %w[git github gitlab],
      "Microservices" => %w[microservices microservice], "TDD" => %w[tdd], "Agile" => %w[agile scrum],
      "SQL" => %w[sql], "Performance tuning" => [ "performance optimization", "performance tuning", "query optimization" ],
      "Stripe" => %w[stripe], "Twilio" => %w[twilio], "OAuth" => %w[oauth oauth2], "Webpack" => %w[webpack], "Vite" => %w[vite]
    }.freeze

    MAX_SKILLS = 40

    PATTERNS = SKILLS.map do |name, aliases|
      terms = ([ name ] + aliases).map { |a| Regexp.escape(a.downcase) }.uniq
      [ name, /(?<![\p{L}\p{N}])(?:#{terms.join('|')})(?![\p{L}\p{N}])/ ]
    end.freeze

    # Like .call, but also returns the exact wording found for each skill (e.g. "Postgres" for PostgreSQL),
    # so a caller can highlight it in the original text.
    def self.matches(text)
      lower = text.to_s.downcase
      PATTERNS.filter_map do |name, re|
        found = lower.scan(re).uniq
        { name: name, terms: found, position: lower.index(re) } if found.any?
      end.sort_by { |m| m[:position] }.first(MAX_SKILLS).map { |m| m.slice(:name, :terms) }
    end

    def self.call(text)
      lower = text.to_s.downcase
      PATTERNS.filter_map { |name, re| (pos = lower.index(re)) && [ pos, name ] }
              .sort_by(&:first).map(&:last).first(MAX_SKILLS)
    end
  end
end
