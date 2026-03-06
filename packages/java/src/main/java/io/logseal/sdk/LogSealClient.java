package io.logseal.sdk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.logseal.sdk.exception.LogSealException;
import io.logseal.sdk.model.*;
import io.logseal.sdk.service.*;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * Client for the LogSeal audit-logging API.
 *
 * <pre>{@code
 * LogSealClient client = LogSealClient.builder("sk_test_...").build();
 *
 * client.emit(new EmitEventInput("user.login", "org_acme", new ActorInput("user_123")));
 *
 * // Graceful shutdown
 * client.shutdown();
 * }</pre>
 */
public class LogSealClient {

    private static final String VERSION = "0.1.0";

    private final String apiKey;
    private final String baseUrl;
    private final int batchSize;
    private final int maxRetries;
    private final ObjectMapper objectMapper;

    private final List<EmitEventInput> queue = new CopyOnWriteArrayList<>();
    private final ScheduledExecutorService scheduler;

    private final EventsService events;
    private final OrganizationsService organizations;
    private final SchemasService schemas;
    private final ViewerTokensService viewerTokens;
    private final WebhooksService webhooks;
    private final ExportsService exports;

    private LogSealClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.baseUrl = builder.baseUrl;
        this.batchSize = builder.batchSize;
        this.maxRetries = builder.maxRetries;
        this.objectMapper = new ObjectMapper();

        this.events = new EventsService(this);
        this.organizations = new OrganizationsService(this);
        this.schemas = new SchemasService(this);
        this.viewerTokens = new ViewerTokensService(this);
        this.webhooks = new WebhooksService(this);
        this.exports = new ExportsService(this);

        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "logseal-flush");
            t.setDaemon(true);
            return t;
        });
        this.scheduler.scheduleAtFixedRate(
            () -> { try { flush(); } catch (Exception ignored) {} },
            builder.flushIntervalMs, builder.flushIntervalMs, TimeUnit.MILLISECONDS
        );
    }

    // ----------------------------------------------------------------
    // Builder
    // ----------------------------------------------------------------

    public static Builder builder(String apiKey) {
        return new Builder(apiKey);
    }

    public static class Builder {
        private final String apiKey;
        private String baseUrl = "https://api.logseal.io";
        private int batchSize = 100;
        private long flushIntervalMs = 5000;
        private int maxRetries = 3;

        private Builder(String apiKey) {
            if (apiKey == null || apiKey.isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }
            this.apiKey = apiKey;
        }

        public Builder baseUrl(String baseUrl) { this.baseUrl = baseUrl; return this; }
        public Builder batchSize(int batchSize) { this.batchSize = batchSize; return this; }
        public Builder flushIntervalMs(long flushIntervalMs) { this.flushIntervalMs = flushIntervalMs; return this; }
        public Builder maxRetries(int maxRetries) { this.maxRetries = maxRetries; return this; }
        public LogSealClient build() { return new LogSealClient(this); }
    }

    // ----------------------------------------------------------------
    // Sub-API accessors
    // ----------------------------------------------------------------

    public EventsService events() { return events; }
    public OrganizationsService organizations() { return organizations; }
    public SchemasService schemas() { return schemas; }
    public ViewerTokensService viewerTokens() { return viewerTokens; }
    public WebhooksService webhooks() { return webhooks; }
    public ExportsService exports() { return exports; }

    // ----------------------------------------------------------------
    // Emit
    // ----------------------------------------------------------------

    /**
     * Queue an event for batched delivery. Returns immediately.
     */
    public void emit(EmitEventInput event) {
        validate(event);
        queue.add(event);
        if (queue.size() >= batchSize) {
            flush();
        }
    }

    /**
     * Emit a single event and wait for server confirmation.
     */
    public EmitEventResponse emitSync(EmitEventInput event) {
        validate(event);
        return request("POST", "/v1/events", formatEvent(event), EmitEventResponse.class);
    }

    /**
     * Flush all queued events to the API immediately.
     *
     * @return the number of events accepted
     */
    public int flush() {
        if (queue.isEmpty()) return 0;

        List<EmitEventInput> batch = new ArrayList<>(queue);
        queue.clear();

        List<Map<String, Object>> formatted = new ArrayList<>();
        for (EmitEventInput e : batch) {
            formatted.add(formatEvent(e));
        }

        try {
            Map<String, Object> body = Map.of("events", formatted);
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = request("POST", "/v1/events/batch", body, Map.class);
            return ((Number) resp.getOrDefault("accepted", 0)).intValue();
        } catch (Exception ex) {
            queue.addAll(0, batch);
            throw ex;
        }
    }

    /**
     * Flush remaining events and shut down the background scheduler.
     */
    public void shutdown() {
        scheduler.shutdown();
        try {
            scheduler.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        flush();
    }

    // ----------------------------------------------------------------
    // Internal HTTP
    // ----------------------------------------------------------------

    public <T> T request(String method, String path, Object body, Class<T> responseType) {
        return requestWithRetry(method, path, body, responseType, 0);
    }

    private <T> T requestWithRetry(String method, String path, Object body, Class<T> responseType, int retry) {
        try {
            URL url = new URL(baseUrl + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod(method);
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("User-Agent", "logseal-java/" + VERSION);
            conn.setConnectTimeout(30_000);
            conn.setReadTimeout(30_000);

            if (body != null) {
                conn.setDoOutput(true);
                byte[] jsonBytes = objectMapper.writeValueAsBytes(body);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(jsonBytes);
                }
            }

            int status = conn.getResponseCode();

            // Retry on rate limit or server error
            if ((status == 429 || status >= 500) && retry < maxRetries) {
                long delay = (long) Math.min(1000 * Math.pow(2, retry), 30_000);
                long jitter = (long) (delay * 0.2 * Math.random());
                Thread.sleep(delay + jitter);
                return requestWithRetry(method, path, body, responseType, retry + 1);
            }

            byte[] responseBytes;
            if (status >= 400) {
                responseBytes = conn.getErrorStream() != null
                    ? conn.getErrorStream().readAllBytes()
                    : new byte[0];
                throwApiError(responseBytes, status);
            }

            responseBytes = conn.getInputStream().readAllBytes();
            if (responseType == Void.class || responseBytes.length == 0) {
                return null;
            }
            return objectMapper.readValue(responseBytes, responseType);

        } catch (LogSealException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("LogSeal request failed: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private void throwApiError(byte[] body, int statusCode) {
        try {
            Map<String, Object> wrapper = objectMapper.readValue(body, Map.class);
            Map<String, Object> err = (Map<String, Object>) wrapper.getOrDefault("error", Map.of());
            throw new LogSealException(
                (String) err.getOrDefault("type", "internal_error"),
                (String) err.getOrDefault("code", "unknown"),
                (String) err.getOrDefault("message", "Unknown error"),
                (String) err.get("param"),
                (String) err.get("doc_url"),
                statusCode
            );
        } catch (LogSealException e) {
            throw e;
        } catch (Exception e) {
            throw new LogSealException("internal_error", "unknown", new String(body, StandardCharsets.UTF_8), null, null, statusCode);
        }
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private static void validate(EmitEventInput event) {
        if (event.getAction() == null || event.getAction().isEmpty()) {
            throw new LogSealException("validation_error", "missing_required_field",
                "The 'action' field is required.", "action");
        }
        if (event.getActor() == null || event.getActor().getId() == null || event.getActor().getId().isEmpty()) {
            throw new LogSealException("validation_error", "missing_required_field",
                "The 'actor.id' field is required.", "actor.id");
        }
        if (event.getOrganizationId() == null || event.getOrganizationId().isEmpty()) {
            throw new LogSealException("validation_error", "missing_required_field",
                "The 'organizationId' field is required.", "organizationId");
        }
    }

    static Map<String, Object> formatEvent(EmitEventInput e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("action", e.getAction());
        m.put("organization_id", e.getOrganizationId());

        Map<String, Object> actor = new LinkedHashMap<>();
        actor.put("id", e.getActor().getId());
        if (e.getActor().getType() != null) actor.put("type", e.getActor().getType());
        if (e.getActor().getName() != null) actor.put("name", e.getActor().getName());
        if (e.getActor().getEmail() != null) actor.put("email", e.getActor().getEmail());
        if (e.getActor().getMetadata() != null) actor.put("metadata", e.getActor().getMetadata());
        m.put("actor", actor);

        if (e.getTargets() != null) {
            List<Map<String, Object>> targets = new ArrayList<>();
            for (TargetInput t : e.getTargets()) {
                Map<String, Object> tm = new LinkedHashMap<>();
                tm.put("type", t.getType());
                tm.put("id", t.getId());
                if (t.getName() != null) tm.put("name", t.getName());
                if (t.getMetadata() != null) tm.put("metadata", t.getMetadata());
                targets.add(tm);
            }
            m.put("targets", targets);
        }
        if (e.getMetadata() != null) m.put("metadata", e.getMetadata());
        if (e.getContext() != null) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            if (e.getContext().getIpAddress() != null) ctx.put("ip_address", e.getContext().getIpAddress());
            if (e.getContext().getUserAgent() != null) ctx.put("user_agent", e.getContext().getUserAgent());
            if (e.getContext().getRequestId() != null) ctx.put("request_id", e.getContext().getRequestId());
            m.put("context", ctx);
        }
        if (e.getOccurredAt() != null) m.put("occurred_at", e.getOccurredAt());
        if (e.getIdempotencyKey() != null) m.put("idempotency_key", e.getIdempotencyKey());
        return m;
    }

    public ObjectMapper getObjectMapper() { return objectMapper; }
}
