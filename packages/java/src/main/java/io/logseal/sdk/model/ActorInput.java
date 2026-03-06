package io.logseal.sdk.model;

import java.util.Map;

/**
 * Describes the actor performing an audited action.
 */
public class ActorInput {

    private final String id;
    private String type;
    private String name;
    private String email;
    private Map<String, Object> metadata;

    public ActorInput(String id) {
        this.id = id;
    }

    public String getId() { return id; }
    public String getType() { return type; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public Map<String, Object> getMetadata() { return metadata; }

    public ActorInput type(String type) { this.type = type; return this; }
    public ActorInput name(String name) { this.name = name; return this; }
    public ActorInput email(String email) { this.email = email; return this; }
    public ActorInput metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
}
