package io.logseal.sdk.service;

import io.logseal.sdk.LogSealClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Operations on viewer tokens.
 */
public class ViewerTokensService {

    private final LogSealClient client;

    public ViewerTokensService(LogSealClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String organizationId, Integer expiresIn) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("organization_id", organizationId);
        if (expiresIn != null) body.put("expires_in", expiresIn);
        return client.request("POST", "/v1/viewer-tokens", body, Map.class);
    }
}
