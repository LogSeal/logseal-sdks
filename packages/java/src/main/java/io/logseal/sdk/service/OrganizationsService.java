package io.logseal.sdk.service;

import io.logseal.sdk.LogSealClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Operations on organizations.
 */
public class OrganizationsService {

    private final LogSealClient client;

    public OrganizationsService(LogSealClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> list() {
        return client.request("GET", "/v1/organizations", null, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String externalId, String name) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("external_id", externalId);
        if (name != null) body.put("name", name);
        return client.request("POST", "/v1/organizations", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return client.request("GET", "/v1/organizations/" + id, null, Map.class);
    }
}
