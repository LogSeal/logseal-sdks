package io.logseal.sdk.service;

import io.logseal.sdk.LogSealClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Operations on webhooks.
 */
public class WebhooksService {

    private final LogSealClient client;

    public WebhooksService(LogSealClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> list() {
        return client.request("GET", "/v1/webhooks", null, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String url, String organizationId, List<String> events, Boolean enabled) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("url", url);
        if (organizationId != null) body.put("organization_id", organizationId);
        if (events != null) body.put("events", events);
        if (enabled != null) body.put("enabled", enabled);
        return client.request("POST", "/v1/webhooks", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return client.request("GET", "/v1/webhooks/" + id, null, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> update(String id, Map<String, Object> fields) {
        return client.request("PATCH", "/v1/webhooks/" + id, fields, Map.class);
    }

    public void delete(String id) {
        client.request("DELETE", "/v1/webhooks/" + id, null, Void.class);
    }
}
