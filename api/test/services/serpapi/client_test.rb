require "test_helper"
require "net/http"

class Serpapi::ClientTest < ActiveSupport::TestCase
  module HTTPStub
    def start(*args, **kwargs, &block)
      if (error = Thread.current[:serpapi_http_error])
        raise error
      elsif (response = Thread.current[:serpapi_http_response])
        http = Object.new
        http.define_singleton_method(:get) { |*| response }
        block_given? ? yield(http) : response
      else
        super
      end
    end
  end

  module FormCapture
    def encode_www_form(enum, *)
      Thread.current[:serpapi_last_params] = enum
      super
    end
  end

  setup do
    http = class << ::Net::HTTP; self; end
    http.prepend(HTTPStub) unless http.ancestors.include?(HTTPStub)
    form = class << ::URI; self; end
    form.prepend(FormCapture) unless form.ancestors.include?(FormCapture)
    @client = Serpapi::Client.new(api_key: "test-key")
  end

  teardown do
    Thread.current[:serpapi_http_error] = nil
    Thread.current[:serpapi_http_response] = nil
  end

  test "loads google jobs, maps and brave answers" do
    http(200, { "jobs_results" => [] })

    assert_equal({ "jobs_results" => [] }, @client.google_jobs(query: "Rails", location: "India"))
    assert_nil last_params[:next_page_token]

    assert_equal({ "jobs_results" => [] }, @client.google_jobs(query: "Rails", location: "India", next_page_token: "page-2"))
    assert_equal "page-2", last_params[:next_page_token]

    assert_equal({ "jobs_results" => [] }, @client.google_maps(query: "Acme Pune", ll: "@18.5,73.8,13z"))
    assert_equal "google_maps", last_params[:engine]

    assert_equal({ "jobs_results" => [] }, @client.brave_ai_mode(query: "Acme profile"))
    assert_equal "brave_ai_mode", last_params[:engine]
  end

  test "rejects a response that is not a json object" do
    http(200, [ 1, 2 ])

    error = assert_raises(Serpapi::Error) { @client.google_jobs(query: "Rails", location: "India") }
    assert_equal "SerpApi returned a response that was not JSON.", error.message

    http_body("not-json")
    error = assert_raises(Serpapi::Error) { @client.google_jobs(query: "Rails", location: "India") }
    assert_equal "SerpApi returned a response that was not JSON.", error.message
  end

  test "raises the api error text, or a fallback when the error is not text" do
    http(500, { "error" => "Invalid API key." })
    error = assert_raises(Serpapi::Error) { @client.google_jobs(query: "Rails", location: "India") }
    assert_equal "Invalid API key.", error.message

    http(200, { "error" => { "code" => 1 } })
    error = assert_raises(Serpapi::Error) { @client.google_jobs(query: "Rails", location: "India") }
    assert_equal "SerpApi could not return Google Jobs.", error.message
  end

  test "raises when the network cannot be reached" do
    [ SocketError, Timeout::Error, Errno::ECONNREFUSED, ::Net::OpenTimeout, ::Net::ReadTimeout ].each do |error_class|
      Thread.current[:serpapi_http_response] = nil
      Thread.current[:serpapi_http_error] = error_class.new("down")

      error = assert_raises(Serpapi::Error) { @client.google_jobs(query: "Rails", location: "India") }
      assert_equal "SerpApi could not be reached.", error.message
    end
  end

  private

  def http(code, payload)
    response = code.between?(200, 299) ? ::Net::HTTPOK.new("1.1", code.to_s, "OK") : ::Net::HTTPInternalServerError.new("1.1", code.to_s, "Error")
    response.instance_variable_set(:@body, JSON.generate(payload))
    response.instance_variable_set(:@read, true)
    Thread.current[:serpapi_http_error] = nil
    Thread.current[:serpapi_http_response] = response
    payload
  end

  def http_body(body)
    response = ::Net::HTTPOK.new("1.1", "200", "OK")
    response.instance_variable_set(:@body, body)
    response.instance_variable_set(:@read, true)
    Thread.current[:serpapi_http_response] = response
  end

  def last_params
    Thread.current[:serpapi_last_params]
  end
end
