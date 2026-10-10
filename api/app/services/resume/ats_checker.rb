module Resume
  # Scores resume text against common ATS parsing rules. Every check carries an impact weight;
  # pass earns all of it, warn half, fail none. Category and overall scores are weighted percentages.
  class AtsChecker
    Check = Struct.new(:id, :label, :status, :detail, :impact, keyword_init: true)

    ACTION_VERBS = %w[
      built developed designed led shipped delivered improved reduced increased migrated implemented
      optimized architected launched maintained created owned scaled refactored automated mentored
      integrated deployed upgraded established
    ].freeze

    RAILS_STACK = %w[
      ruby rails postgresql postgres mysql redis sidekiq rspec minitest graphql rest api docker
      aws heroku kubernetes hotwire turbo stimulus activerecord capybara elasticsearch kafka
    ].freeze

    STOPWORDS = %w[a an and are as at be by for from in is it of on or the to with we you your will our
                   this that have has can must should experience years work working role engineer].freeze

    MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?".freeze
    DATE_RANGE = /(?:#{MONTH}\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:#{MONTH}\s+)?(?:19|20)\d{2}|present|current|now)/i

    def self.call(extraction, filename: nil, target_role: nil)
      new(extraction, filename: filename, target_role: target_role).call
    end

    def initialize(extraction, filename:, target_role:)
      @extraction = extraction
      @text = extraction.text
      @lower = @text.downcase
      @words = @text.scan(/[\p{L}\p{N}+#.]+/)
      @lines = @text.lines.map(&:strip).reject(&:empty?)
      @filename = filename
      @target_role = target_role.to_s.strip.presence
    end

    def call
      categories = [
        category("essentials", "ATS essentials", essentials),
        category("contact", "Contact info", contact),
        category("sections", "Sections", sections),
        category("content", "Content quality", content),
        category("dates", "Employment dates", dates),
        category("rails", "Rails skills", rails_skills)
      ]
      categories << category("target", "Target role fit", target_role_fit) if @target_role

      all = categories.flat_map { |c| c[:checks] }
      total_impact = all.sum { |c| c[:impact] }
      earned = all.sum { |c| earned_for(c[:status], c[:impact]) }
      overall = (earned * 100.0 / total_impact).round
      passed = all.count { |c| c[:status] == "pass" }

      categories.each do |cat|
        lost = cat[:checks].sum { |c| c[:impact] - earned_for(c[:status], c[:impact]) }
        cat[:points_to_gain] = (lost * 100.0 / total_impact).round
      end

      {
        overall_score: overall,
        summary: summary_for(overall, all.size - passed),
        passed_count: passed,
        failed_count: all.size - passed,
        total_checks: all.size,
        filename: @filename,
        target_role: @target_role,
        categories: categories
      }
    end

    private

    def earned_for(status, impact)
      { "pass" => impact, "warn" => impact / 2.0 }.fetch(status, 0)
    end

    def category(id, label, checks)
      total = checks.sum(&:impact)
      earned = checks.sum { |c| earned_for(c.status, c.impact) }
      {
        id: id,
        label: label,
        score: (earned * 100.0 / total).round,
        points_to_gain: 0,
        checks: checks.map(&:to_h).sort_by { |c| [ c[:status] == "pass" ? 1 : 0, -c[:impact] ] }
      }
    end

    def check(id, label, status, detail, impact)
      Check.new(id: id, label: label, status: status, detail: detail, impact: impact)
    end

    def rate(id, label, impact, pass:, warn: false, pass_detail:, fail_detail:, warn_detail: nil)
      if pass
        check(id, label, "pass", pass_detail, impact)
      elsif warn
        check(id, label, "warn", warn_detail || fail_detail, impact)
      else
        check(id, label, "fail", fail_detail, impact)
      end
    end

    def essentials
      count = @words.size
      [
        rate("text_extractable", "Text can be extracted", 10, pass: @text.length >= 200,
             pass_detail: "#{@text.length} characters read cleanly.",
             fail_detail: "Almost no text was found. Scanned images or outlined fonts are invisible to an ATS; export a text-based file."),
        rate("length", "Sensible length", 6, pass: count.between?(300, 1100), warn: count.between?(150, 1600),
             pass_detail: "#{count} words.",
             fail_detail: "#{count} words. Aim for roughly 300 to 1,100."),
        rate("page_count", "Two pages or fewer", 4,
             pass: @extraction.pages.nil? || @extraction.pages <= 2, warn: @extraction.pages.to_i == 3,
             pass_detail: @extraction.pages ? "#{@extraction.pages} page(s)." : "Page count is not available for Word files.",
             fail_detail: "#{@extraction.pages} pages. Recruiters rarely read beyond two."),
        rate("no_tables", "No layout tables", 6, pass: @extraction.tables.zero?,
             pass_detail: "No tables or multi-column grids found.",
             fail_detail: "#{@extraction.tables} table(s) found. Many ATS parsers read tables out of order; use plain paragraphs."),
        rate("file_name", "Descriptive file name", 2, pass: good_filename?, warn: @filename.present?,
             pass_detail: "File name looks professional.",
             fail_detail: "Name the file like firstname-lastname-resume.pdf instead of a generic name.")
      ]
    end

    def good_filename?
      base = File.basename(@filename.to_s, ".*").downcase
      base.present? && base.match?(/[a-z]{2,}/) && !base.match?(/\A(resume|cv|document|untitled|new|scan)\d*\z/)
    end

    def contact
      header = @lines.first(8).join(" ")
      [
        rate("email", "Email address", 8, pass: @text.match?(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/),
             pass_detail: "Email found.", fail_detail: "No email address found in the text."),
        rate("phone", "Phone number", 6, pass: @text.match?(/(?:\+?\d[\d\s().-]{8,}\d)/),
             pass_detail: "Phone number found.", fail_detail: "No phone number found."),
        rate("links", "LinkedIn or GitHub link", 4, pass: @lower.match?(/linkedin\.com|github\.com/),
             pass_detail: "Profile link found.", fail_detail: "Add a LinkedIn or GitHub URL as plain text."),
        rate("location", "City or location", 3,
             pass: header.match?(/\b(india|bengaluru|bangalore|mumbai|delhi|pune|hyderabad|chennai|kolkata|noida|gurgaon|gurugram|remote)\b/i) || header.include?(","),
             pass_detail: "Location appears in the header.", fail_detail: "Add your city near the top; many roles filter by location."),
        rate("contact_in_body", "Contact details near the top", 3,
             pass: @text.index(/@/).to_i < 600 && @text.include?("@"),
             pass_detail: "Contact details sit in the first lines.",
             fail_detail: "Put contact details at the top of the body, not in a header or footer the ATS may skip.")
      ]
    end

    SECTION_PATTERNS = {
      "experience" => /^(?:work |professional )?experience|employment( history)?|work history/i,
      "education" => /^education|academic/i,
      "skills" => /^(?:technical |key )?skills|technologies|tech stack/i,
      "summary" => /^(?:professional )?summary|^profile|^objective|^about/i,
      "projects" => /^projects|open[- ]source/i
    }.freeze

    def sections
      found = SECTION_PATTERNS.transform_values { |re| @lines.any? { |l| l.length <= 40 && l.match?(re) } }
      [
        rate("experience", "Experience section", 10, pass: found["experience"],
             pass_detail: "Experience heading found.", fail_detail: "Add a heading titled “Experience” or “Work Experience”."),
        rate("education", "Education section", 5, pass: found["education"],
             pass_detail: "Education heading found.", fail_detail: "Add an “Education” heading."),
        rate("skills", "Skills section", 8, pass: found["skills"],
             pass_detail: "Skills heading found.", fail_detail: "Add a “Skills” heading so keywords are grouped and easy to match."),
        rate("summary", "Summary", 3, pass: found["summary"], warn: false,
             pass_detail: "Summary heading found.", fail_detail: "A two-line summary at the top helps both software and humans."),
        rate("projects", "Projects or open source", 2, pass: found["projects"], warn: true,
             pass_detail: "Projects heading found.", fail_detail: "Optional: list notable projects or open-source work.")
      ]
    end

    def content
      bullets = @lines.count { |l| l.match?(/\A[•▪●◦■\-–*·]\s*\S/) }
      numbers = @text.scan(/\d+(?:\.\d+)?\s*(?:%|x\b|k\b|\+|ms\b|users|customers|requests|seconds|hours|lakh|crore)/i).size
      verbs = ACTION_VERBS.count { |v| @lower.match?(/\b#{v}\b/) }
      pronouns = @text.scan(/\b(?:I|my|me|myself)\b/).size
      [
        rate("bullets", "Bulleted achievements", 6, pass: bullets >= 6, warn: bullets >= 3,
             pass_detail: "#{bullets} bullet points.", fail_detail: "#{bullets} bullet points. Describe each role with 3 to 5 bullets."),
        rate("quantified", "Quantified results", 7, pass: numbers >= 4, warn: numbers >= 2,
             pass_detail: "#{numbers} measurable results.", fail_detail: "#{numbers} measurable results. Add numbers such as “cut p95 latency by 40%”."),
        rate("action_verbs", "Strong action verbs", 5, pass: verbs >= 6, warn: verbs >= 3,
             pass_detail: "#{verbs} distinct action verbs.", fail_detail: "Start bullets with verbs like built, shipped, migrated, reduced."),
        rate("no_pronouns", "No first-person pronouns", 2, pass: pronouns.zero?, warn: pronouns <= 2,
             pass_detail: "No “I” or “my” statements.", fail_detail: "#{pronouns} first-person pronouns. Resumes read tighter without them.")
      ]
    end

    def dates
      ranges = @text.scan(DATE_RANGE).size
      [
        rate("date_ranges", "Parseable employment dates", 8, pass: ranges >= 2, warn: ranges == 1,
             pass_detail: "#{ranges} date ranges found (e.g. Jan 2021 – Present).",
             fail_detail: "No clear date ranges. Use “Jan 2021 – Present” so tenure can be calculated."),
        rate("date_format", "Consistent date format", 3,
             pass: !(@text.match?(DATE_RANGE) && @text.match?(%r{\b\d{1,2}/\d{4}\b}) && @text.match?(/\b#{MONTH}\s+(?:19|20)\d{2}/i)),
             pass_detail: "Dates follow one format.", fail_detail: "Mixed date styles (e.g. 03/2021 and Mar 2021). Pick one.")
      ]
    end

    def rails_skills
      hits = RAILS_STACK.select { |k| @lower.match?(/(?<![a-z])#{Regexp.escape(k)}(?![a-z])/) }
      [
        rate("ruby_rails", "Ruby and Rails named", 10, pass: @lower.include?("ruby") && @lower.include?("rails"),
             warn: @lower.include?("ruby") || @lower.include?("rails"),
             pass_detail: "Ruby and Rails both appear.", fail_detail: "Name Ruby and Rails explicitly; recruiter searches match on them."),
        rate("ecosystem", "Ecosystem keywords", 6, pass: hits.size >= 6, warn: hits.size >= 3,
             pass_detail: "#{hits.size} related terms: #{hits.first(6).join(', ')}.",
             fail_detail: "#{hits.size} related terms. Mention tools you use such as PostgreSQL, Sidekiq, RSpec, Redis.")
      ]
    end

    def target_role_fit
      keywords = @target_role.downcase.scan(/[a-z][a-z0-9+#.]{1,}/).uniq - STOPWORDS
      return [ check("target_keywords", "Target role keywords", "warn", "Target role had no usable keywords.", 1) ] if keywords.empty?

      matched = keywords.select { |k| @lower.match?(/(?<![a-z0-9])#{Regexp.escape(k)}(?![a-z0-9])/) }
      missing = keywords - matched
      ratio = matched.size.fdiv(keywords.size)
      [
        rate("target_keywords", "Target role keyword coverage", 12, pass: ratio >= 0.7, warn: ratio >= 0.4,
             pass_detail: "#{matched.size} of #{keywords.size} keywords matched.",
             fail_detail: "#{matched.size} of #{keywords.size} keywords matched. Missing: #{missing.first(8).join(', ')}.")
      ]
    end

    def summary_for(score, issues)
      if score >= 85 then "Strong. ATS-ready."
      elsif score >= 70 then "Close. #{issues} fixes left."
      else "Needs work. #{issues} issues to fix."
      end
    end
  end
end
