# frozen_string_literal: true

require "webmock/rspec"
require_relative "../lib/logseal"

RSpec.describe LogSeal::Client do
  let(:client) { LogSeal.new(api_key: "sk_test_abc", base_url: "https://api.logseal.io") }

  describe "#initialize" do
    it "raises on missing api_key" do
      expect { LogSeal.new(api_key: "") }.to raise_error(ArgumentError, /api_key/)
    end
  end

  describe "#emit" do
    it "queues an event" do
      result = client.emit(action: "user.login", organization_id: "org_1", actor: { id: "u1" })
      expect(result).to eq({ status: "queued" })
    end

    it "validates action" do
      expect {
        client.emit(action: "", organization_id: "org_1", actor: { id: "u1" })
      }.to raise_error(LogSeal::Error, /action/)
    end

    it "validates actor.id" do
      expect {
        client.emit(action: "test", organization_id: "org_1", actor: { id: nil })
      }.to raise_error(LogSeal::Error, /actor/)
    end

    it "validates organization_id" do
      expect {
        client.emit(action: "test", organization_id: "", actor: { id: "u1" })
      }.to raise_error(LogSeal::Error, /organization_id/)
    end
  end

  describe "#emit_sync" do
    it "sends event and returns response" do
      stub_request(:post, "https://api.logseal.io/v1/events")
        .to_return(status: 200, body: {
          id: "evt_1", action: "user.login", occurred_at: "2025-01-01T00:00:00Z",
          received_at: "2025-01-01T00:00:00Z", organization_id: "org_acme", object: "event"
        }.to_json, headers: { "Content-Type" => "application/json" })

      resp = client.emit_sync(action: "user.login", organization_id: "org_acme", actor: { id: "u1" })
      expect(resp["id"]).to eq("evt_1")
    end
  end

  describe "#flush" do
    it "returns 0 for empty queue" do
      expect(client.flush).to eq(0)
    end

    it "sends batched events" do
      stub_request(:post, "https://api.logseal.io/v1/events/batch")
        .to_return(status: 200, body: { accepted: 2, rejected: 0, object: "batch" }.to_json,
                   headers: { "Content-Type" => "application/json" })

      client.emit(action: "a", organization_id: "o", actor: { id: "u" })
      client.emit(action: "b", organization_id: "o", actor: { id: "u" })
      expect(client.flush).to eq(2)
    end
  end

  describe "API errors" do
    it "raises LogSeal::Error on 401" do
      stub_request(:post, "https://api.logseal.io/v1/events")
        .to_return(status: 401, body: {
          error: { type: "authentication_error", code: "invalid_api_key", message: "Invalid API key" }
        }.to_json, headers: { "Content-Type" => "application/json" })

      expect {
        client.emit_sync(action: "test", organization_id: "o", actor: { id: "u" })
      }.to raise_error(LogSeal::Error) { |e|
        expect(e.type).to eq("authentication_error")
        expect(e.status_code).to eq(401)
      }
    end
  end

  describe "events.list" do
    it "returns paginated events" do
      stub_request(:get, /events/)
        .to_return(status: 200, body: {
          data: [{ id: "evt_1", action: "user.login", occurred_at: "2025-01-01T00:00:00Z",
                   received_at: "2025-01-01T00:00:00Z", actor: { id: "u1", type: "user" },
                   targets: [], metadata: {}, context: {}, event_hash: "abc", object: "event" }],
          has_more: false, object: "list"
        }.to_json, headers: { "Content-Type" => "application/json" })

      page = client.events.list(organization_id: "org_acme")
      expect(page["data"].length).to eq(1)
      expect(page["data"].first["id"]).to eq("evt_1")
    end
  end
end
