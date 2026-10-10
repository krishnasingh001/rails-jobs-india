module Resume
  # Estimates years of experience from resume text, without AI.
  # Prefers a figure the candidate states ("5+ years of experience"); otherwise adds up
  # the month-and-year ranges in the work history ("Jan 2019 - Present"), merging overlaps.
  # Year-only ranges are ignored on purpose, since those are usually education.
  class ExperienceEstimator
    MONTHS = %w[jan feb mar apr may jun jul aug sep oct nov dec].freeze
    MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?"
    DASH = "\\s*(?:-|–|—|to|until|till)\\s*"
    PRESENT = "present|current|currently|now|till date|to date|ongoing"

    NAMED_RANGE = /#{MONTH}[\s,]*(\d{4})#{DASH}(?:#{MONTH}[\s,]*(\d{4})|(#{PRESENT}))/i
    NUMERIC_RANGE = %r{\b(\d{1,2})/(\d{4})#{DASH}(?:(\d{1,2})/(\d{4})|(#{PRESENT}))}i
    STATED = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b(?:\s+of)?\s+(?:(?:total|overall|professional|relevant|work|industry|hands-on|software|development|engineering)\s+)*experience/i
    STATED_REVERSED = /experience\s+(?:of\s+)?(?:over\s+|more than\s+|around\s+|about\s+)?(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/i

    MAX_YEARS = 45

    def self.call(text, today: Time.zone.today)
      new(text, today).call
    end

    def initialize(text, today)
      @text = text.to_s
      @today = today
    end

    def call
      stated = stated_years
      return { years: stated, source: "stated" } if stated

      from_dates = years_from_dates
      return { years: from_dates, source: "dates" } if from_dates

      { years: nil, source: nil }
    end

    private

    attr_reader :text, :today

    def stated_years
      numbers = text.scan(STATED).flatten + text.scan(STATED_REVERSED).flatten
      value = numbers.map(&:to_f).select { |n| n.positive? && n <= MAX_YEARS }.max
      value&.round(1)
    end

    def years_from_dates
      ranges = named_ranges + numeric_ranges
      return nil if ranges.empty?

      months = merge(ranges).sum { |from, to| to - from }  # to is exclusive: the end month counts
      return nil if months <= 0

      [ (months / 12.0).round(1), MAX_YEARS ].min
    end

    def named_ranges
      text.scan(NAMED_RANGE).filter_map do |from_month, from_year, to_month, to_year, present|
        from = index(MONTHS.index(from_month.downcase[0, 3]) + 1, from_year.to_i)
        to = present ? index(today.month, today.year) : index(MONTHS.index(to_month.downcase[0, 3]) + 1, to_year.to_i)
        [ from, to + 1 ] if valid?(from, to)
      end
    end

    def numeric_ranges
      text.scan(NUMERIC_RANGE).filter_map do |from_month, from_year, to_month, to_year, present|
        next unless (1..12).cover?(from_month.to_i)
        next unless present || (1..12).cover?(to_month.to_i)

        from = index(from_month.to_i, from_year.to_i)
        to = present ? index(today.month, today.year) : index(to_month.to_i, to_year.to_i)
        [ from, to + 1 ] if valid?(from, to)
      end
    end

    def index(month, year)
      year * 12 + month
    end

    def valid?(from, to)
      to >= from && from >= index(1, 1970) && to <= index(today.month, today.year)
    end

    def merge(ranges)
      ranges.sort.each_with_object([]) do |(from, to), merged|
        if merged.any? && from <= merged.last[1]
          merged.last[1] = [ merged.last[1], to ].max
        else
          merged << [ from, to ]
        end
      end
    end
  end
end
