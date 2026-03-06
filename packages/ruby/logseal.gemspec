Gem::Specification.new do |s|
  s.name        = "logseal"
  s.version     = "0.1.1"
  s.summary     = "Official Ruby SDK for LogSeal"
  s.description = "Audit logging for B2B SaaS — emit, query, verify, and export audit events."
  s.authors     = ["LogSeal"]
  s.email       = "support@logseal.io"
  s.homepage    = "https://github.com/LogSeal/logseal-sdks/tree/main/packages/ruby"
  s.license     = "MIT"
  s.required_ruby_version = ">= 3.0"

  s.files = Dir["lib/**/*.rb"] + ["README.md"]

  s.add_dependency "faraday", ">= 2.0", "< 3.0"
  s.add_dependency "faraday-retry", ">= 2.0", "< 3.0"

  s.add_development_dependency "rspec", "~> 3.12"
  s.add_development_dependency "webmock", "~> 3.19"
  s.add_development_dependency "rubocop", "~> 1.60"
end
