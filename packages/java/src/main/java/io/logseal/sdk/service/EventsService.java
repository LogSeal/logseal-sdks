package io.logseal.sdk.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.logseal.sdk.LogSealClient;
import io.logseal.sdk.model.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Operations on audit events.
 */
public class EventsService {

    private final LogSealClient client;

    public EventsService(LogSealClient client) {
        this.client = client;
    }

    /**
     * List events with filtering and pagination.
     */
    @SuppressWarnings("unchecked")
    public PaginatedList<AuditEvent> list(ListEventsParams params) {
        StringBuilder path = new StringBuilder("/v1/events?organization_id=").append(params.getOrganizationId());
        if (params.getAction() != null) path.append("&action=").append(params.getAction());
        if (params.getActionPrefix() != null) path.append("&action_prefix=").append(params.getActionPrefix());
        if (params.getActorId() != null) path.append("&actor_id=").append(params.getActorId());
        if (params.getTargetType() != null) path.append("&target_type=").append(params.getTargetType());
        if (params.getTargetId() != null) path.append("&target_id=").append(params.getTargetId());
        if (params.getAfter() != null) path.append("&after=").append(params.getAfter());
        if (params.getBefore() != null) path.append("&before=").append(params.getBefore());
        if (params.getSearch() != null) path.append("&search=").append(params.getSearch());
        if (params.getLimit() != null) path.append("&limit=").append(params.getLimit());
        if (params.getCursor() != null) path.append("&cursor=").append(params.getCursor());

        Map<String, Object> raw = client.request("GET", path.toString(), null, Map.class);
        return deserializePaginatedEvents(raw);
    }

    /**
     * Retrieve a single event by ID.
     */
    public AuditEvent get(String eventId) {
        return client.request("GET", "/v1/events/" + eventId, null, AuditEvent.class);
    }

    /**
     * Verify hash-chain integrity for an organization.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> verify(String organizationId) {
        Map<String, Object> body = Map.of("organization_id", organizationId);
        return client.request("POST", "/v1/events/verify", body, Map.class);
    }

    /**
     * Auto-paginate through all matching events.
     */
    public void listAll(ListEventsParams params, Consumer<AuditEvent> consumer) {
        String cursor = null;
        do {
            params.cursor(cursor);
            PaginatedList<AuditEvent> page = list(params);
            for (AuditEvent event : page.getData()) {
                consumer.accept(event);
            }
            cursor = page.isHasMore() ? page.getNextCursor() : null;
        } while (cursor != null);
    }

    @SuppressWarnings("unchecked")
    private PaginatedList<AuditEvent> deserializePaginatedEvents(Map<String, Object> raw) {
        ObjectMapper om = client.getObjectMapper();
        List<AuditEvent> data = om.convertValue(raw.get("data"), new TypeReference<List<AuditEvent>>() {});
        PaginatedList<AuditEvent> result = new PaginatedList<>();
        result.setData(data);
        result.setHasMore((Boolean) raw.getOrDefault("has_more", false));
        result.setNextCursor((String) raw.get("next_cursor"));
        return result;
    }
}
