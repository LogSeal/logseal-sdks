package io.logseal.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AuditEvent {

    private String id;
    private String action;

    @JsonProperty("occurred_at")
    private String occurredAt;

    @JsonProperty("received_at")
    private String receivedAt;

    private Map<String, Object> actor;
    private List<Map<String, Object>> targets;
    private Map<String, Object> metadata;
    private Map<String, Object> context;

    @JsonProperty("event_hash")
    private String eventHash;

    private String object;

    public String getId() { return id; }
    public String getAction() { return action; }
    public String getOccurredAt() { return occurredAt; }
    public String getReceivedAt() { return receivedAt; }
    public Map<String, Object> getActor() { return actor; }
    public List<Map<String, Object>> getTargets() { return targets; }
    public Map<String, Object> getMetadata() { return metadata; }
    public Map<String, Object> getContext() { return context; }
    public String getEventHash() { return eventHash; }
    public String getObject() { return object; }
}
