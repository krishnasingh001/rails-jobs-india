module Resume
  # Compares the skills a job description asks for with the skills a candidate lists.
  # Pure dictionary matching, no AI: only skills in SkillExtractor::SKILLS are recognised.
  class JobFit
    def self.call(description:, title: "", skills: [])
      required = SkillExtractor.matches("#{title}\n#{description}")
      have = Array(skills).map { |skill| skill.to_s.downcase }.to_set
      matched, missing = required.partition { |skill| have.include?(skill[:name].downcase) }

      {
        required: required,
        matched: matched.map { |skill| skill[:name] },
        missing: missing.map { |skill| skill[:name] },
        score: required.empty? ? nil : (matched.size * 100.0 / required.size).round
      }
    end
  end
end
