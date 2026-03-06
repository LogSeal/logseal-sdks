package io.logseal.sdk.service;

import io.logseal.sdk.LogSealClient;
import io.logseal.sdk.exception.LogSealException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Operations on export jobs.
 */
public class ExportsService {

    private final LogSealClient client;

    public ExportsService(LogSealClient client) {
        this.client = client;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(String organizationId, String format, Map<String, Object> filters) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("organization_id", organizationId);
        body.put("format", format);
        if (filters != null) body.put("filters", filters);
        return client.request("POST", "/v1/exports", body, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> get(String id) {
        return client.request("GET", "/v1/exports/" + id, null, Map.class);
    }

    /**
     * Poll an export until it completes or fails.
     *
     * @param id          the export job ID
     * @param intervalMs  milliseconds between polls (default 1000)
     * @param timeoutMs   maximum milliseconds to wait (default 60000)
     * @return the completed or failed export
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> poll(String id, long intervalMs, long timeoutMs) {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < timeoutMs) {
            Map<String, Object> export = get(id);
            String status = (String) export.get("status");
            if ("completed".equals(status) || "failed".equals(status)) {
                return export;
            }
            try {
                Thread.sleep(intervalMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while polling export", e);
            }
        }
        throw new LogSealException("internal_error", "export_timeout",
            "Export did not complete within the timeout period.", null);
    }
}
