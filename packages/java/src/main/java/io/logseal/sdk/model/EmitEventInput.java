package io.logseal.sdk.model;

import java.util.List;
import java.util.Map;

/**
 * Input for emitting an audit event.
 *
 * <pre>{@code
 * new EmitEventInput("document.published", "org_acme", new ActorInput("user_123").name("Jane"))
 *     .targets(List.of(new TargetInput("document", "doc_456").name("Q3 Report")))
 *     .metadata(Map.of("previousStatus", "draft"));
 * }</pre>
 */
public class EmitEventInput {

    private final String action;
    private final String organizationId;
    private final ActorInput actor;
    private List<TargetInput> targets;
    private Map<String, Object> metadata;
    private EventContext context;
    private String occurredAt;
    private String idempotencyKey;

    public EmitEventInput(String action, String organizationId, ActorInput actor) {
        this.action = action;
        this.organizationId = organizationId;
        this.actor = actor;
    }

    public String getAction() { return action; }
    public String getOrganizationId() { return organizationId; }
    public ActorInput getActor() { return actor; }
    public List<TargetInput> getTargets() { return targets; }
    public Map<String, Object> getMetadata() { return metadata; }
    public EventContext getContext() { return context; }
    public String getOccurredAt() { return occurredAt; }
    public String getIdempotencyKey() { return idempotencyKey; }

    public EmitEventInput targets(List<TargetInput> targets) { this.targets = targets; return this; }
    public EmitEventInput metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
    public EmitEventInput context(EventContext context) { this.context = context; return this; }
    public EmitEventInput occurredAt(String occurredAt) { this.occurredAt = occurredAt; return this; }
    public EmitEventInput idempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; return this; }
}
