require "stringio"

module Resume
  # Pulls plain text out of an uploaded PDF or DOCX held in memory. Nothing is written to disk.
  class TextExtractor
    class Error < StandardError; end

    MAX_BYTES = 5.megabytes
    DOCX_ENTRY = "word/document.xml".freeze
    WORD_NS = { "w" => "http://schemas.openxmlformats.org/wordprocessingml/2006/main" }.freeze

    Result = Struct.new(:text, :format, :pages, :tables, keyword_init: true)

    def self.call(bytes)
      new(bytes).call
    end

    def initialize(bytes)
      @bytes = bytes.to_s.b
    end

    def call
      raise Error, "The file is empty." if @bytes.empty?
      raise Error, "Resume must be 5MB or smaller." if @bytes.bytesize > MAX_BYTES

      if @bytes.start_with?("%PDF")
        extract_pdf
      elsif @bytes.start_with?("PK")
        extract_docx
      else
        raise Error, "Please upload a PDF or DOCX resume."
      end
    end

    private

    def extract_pdf
      reader = PDF::Reader.new(StringIO.new(@bytes))
      text = reader.pages.map(&:text).join("\n")
      Result.new(text: clean(text), format: :pdf, pages: reader.page_count, tables: 0)
    rescue PDF::Reader::MalformedPDFError, PDF::Reader::UnsupportedFeatureError, PDF::Reader::EncryptedPDFError
      raise Error, "This PDF could not be read. It may be corrupted or password protected."
    end

    def extract_docx
      xml = nil
      Zip::File.open_buffer(StringIO.new(@bytes)) do |zip|
        entry = zip.find_entry(DOCX_ENTRY) or raise Error, "This does not look like a Word document."
        # Zip bombs: refuse to inflate an unreasonably large document body.
        raise Error, "This document is too large to analyze." if entry.size > 20.megabytes

        xml = entry.get_input_stream.read
      end
      doc = Nokogiri::XML(xml) { |config| config.nonet.strict }
      paragraphs = doc.xpath("//w:p", WORD_NS).map { |p| p.xpath(".//w:t", WORD_NS).map(&:text).join }
      Result.new(
        text: clean(paragraphs.join("\n")),
        format: :docx,
        pages: nil,
        tables: doc.xpath("//w:tbl", WORD_NS).size
      )
    rescue Zip::Error, Nokogiri::XML::SyntaxError
      raise Error, "This Word document could not be read."
    end

    def clean(text)
      text.to_s.encode("UTF-8", invalid: :replace, undef: :replace, replace: " ")
          .gsub(/[ \t]+/, " ").gsub(/\n{3,}/, "\n\n").strip
    end
  end
end
