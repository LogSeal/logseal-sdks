package io.logseal.sdk.exception;

/**
 * Thrown when the LogSeal API returns an error response.
 */
public class LogSealException extends RuntimeException {

    private final String type;
    private final String code;
    private final String param;
    private final String docUrl;
    private final int statusCode;

    public LogSealException(String type, String code, String message, String param, String docUrl, int statusCode) {
        super(message);
        this.type = type;
        this.code = code;
        this.param = param;
        this.docUrl = docUrl;
        this.statusCode = statusCode;
    }

    public LogSealException(String type, String code, String message, String param) {
        this(type, code, message, param, null, 400);
    }

    public String getType() { return type; }
    public String getCode() { return code; }
    public String getParam() { return param; }
    public String getDocUrl() { return docUrl; }
    public int getStatusCode() { return statusCode; }

    @Override
    public String toString() {
        return String.format("LogSealException[%s] %s: %s", type, code, getMessage());
    }
}
