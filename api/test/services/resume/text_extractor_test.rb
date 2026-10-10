require "test_helper"

class Resume::TextExtractorTest < ActiveSupport::TestCase
  test "rejects an empty file and a file over 5MB" do
    assert_equal "The file is empty.", error_for("")
    assert_equal "Resume must be 5MB or smaller.", error_for("x" * (Resume::TextExtractor::MAX_BYTES + 1))
  end

  test "rejects a pdf that cannot be read" do
    assert_equal "This PDF could not be read. It may be corrupted or password protected.", error_for("%PDF-1.4\nnot a real pdf")
  end

  test "rejects a word file that is not readable xml" do
    broken_zip = +"PK\x03\x04not a zip"
    assert_equal "This Word document could not be read.", error_for(broken_zip)

    io = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("word/document.xml")
      zip.write("<not-xml")
    end
    assert_equal "This Word document could not be read.", error_for(io.string)
  end

  test "rejects a word document whose body is unreasonably large" do
    io = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("word/document.xml")
      zip.write("a" * (20.megabytes + 1))
    end

    assert_equal "This document is too large to analyze.", error_for(io.string)
  end

  private

  def error_for(bytes)
    Resume::TextExtractor.call(bytes)
    flunk("expected an error")
  rescue Resume::TextExtractor::Error => error
    error.message
  end
end
