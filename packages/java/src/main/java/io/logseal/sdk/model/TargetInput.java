package io.logseal.sdk.model;

import java.util.Map;

/**
 * Describes the target of an audited action.
 */
public class TargetInput {

    private final String type;
    private final String id;
    private String name;
    private Map<String, Object> metadata;

    public TargetInput(String type, String id) {
        this.type = type;
        this.id = id;
    }

    public String getType() { return type; }
    public String getId() { return id; }
    public String getName() { return name; }
    public Map<String, Object> getMetadata() { return metadata; }

    public TargetInput name(String name) { this.name = name; return this; }
    public TargetInput metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
}
