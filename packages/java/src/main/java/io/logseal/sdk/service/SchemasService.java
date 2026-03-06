package io.logseal.sdk.service;

import io.logseal.sdk.LogSealClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Operations on event schemas.
 */
public class SchemasService {

    private final LogSealClient client;

    public SchemasService(LogSealClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> list() {
        return client.request("GET", "/v1/schemas", null, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String action, String description, List<String> targetTypes, Map<String, Object> metadataSchema) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("action", action);
        if (description != null) body.put("description", description);
        if (targetTypes != null) body.put("target_types", targetTypes);
        if (metadataSchema != null) body.put("metadata_schema", metadataSchema);
        return client.request("POST", "/v1/schemas", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return client.request("GET", "/v1/schemas/" + id, null, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String id, Map<String, Object> fields) {
        return client.request("PATCH", "/v1/schemas/" + id, fields, Map.class);
    }

    public void delete(String id) {
        client.request("DELETE", "/v1/schemas/" + id, null, Void.class);
    }
}
