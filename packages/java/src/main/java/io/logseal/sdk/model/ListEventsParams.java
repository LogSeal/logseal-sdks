package io.logseal.sdk.model;

/**
 * Query parameters for listing events.
 */
public class ListEventsParams {

    private final String organizationId;
    private String action;
    private String actionPrefix;
    private String actorId;
    private String targetType;
    private String targetId;
    private String after;
    private String before;
    private String search;
    private Integer limit;
    private String cursor;

    public ListEventsParams(String organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationId() { return organizationId; }
    public String getAction() { return action; }
    public String getActionPrefix() { return actionPrefix; }
    public String getActorId() { return actorId; }
    public String getTargetType() { return targetType; }
    public String getTargetId() { return targetId; }
    public String getAfter() { return after; }
    public String getBefore() { return before; }
    public String getSearch() { return search; }
    public Integer getLimit() { return limit; }
    public String getCursor() { return cursor; }

    public ListEventsParams action(String action) { this.action = action; return this; }
    public ListEventsParams actionPrefix(String actionPrefix) { this.actionPrefix = actionPrefix; return this; }
    public ListEventsParams actorId(String actorId) { this.actorId = actorId; return this; }
    public ListEventsParams targetType(String targetType) { this.targetType = targetType; return this; }
    public ListEventsParams targetId(String targetId) { this.targetId = targetId; return this; }
    public ListEventsParams after(String after) { this.after = after; return this; }
    public ListEventsParams before(String before) { this.before = before; return this; }
    public ListEventsParams search(String search) { this.search = search; return this; }
    public ListEventsParams limit(int limit) { this.limit = limit; return this; }
    public ListEventsParams cursor(String cursor) { this.cursor = cursor; return this; }
}
