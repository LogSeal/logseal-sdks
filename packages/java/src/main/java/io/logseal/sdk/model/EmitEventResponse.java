package io.logseal.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class EmitEventResponse {

    private String id;
    private String action;

    @JsonProperty("occurred_at")
    private String occurredAt;

    @JsonProperty("received_at")
    private String receivedAt;

    @JsonProperty("organization_id")
    private String organizationId;

    private String object;

    public String getId() { return id; }
    public String getAction() { return action; }
    public String getOccurredAt() { return occurredAt; }
    public String getReceivedAt() { return receivedAt; }
    public String getOrganizationId() { return organizationId; }
    public String getObject() { return object; }
}
