package io.logseal.sdk.model;

/**
 * Request context for an audit event.
 */
public class EventContext {

    private String ipAddress;
    private String userAgent;
    private String requestId;

    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }
    public String getRequestId() { return requestId; }

    public EventContext ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
    public EventContext userAgent(String userAgent) { this.userAgent = userAgent; return this; }
    public EventContext requestId(String requestId) { this.requestId = requestId; return this; }
}
