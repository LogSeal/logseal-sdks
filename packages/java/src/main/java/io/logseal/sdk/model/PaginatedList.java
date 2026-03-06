package io.logseal.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PaginatedList<T> {

    private List<T> data;

    @JsonProperty("has_more")
    private boolean hasMore;

    @JsonProperty("next_cursor")
    private String nextCursor;

    private String object;

    public List<T> getData() { return data; }
    public boolean isHasMore() { return hasMore; }
    public String getNextCursor() { return nextCursor; }
    public String getObject() { return object; }

    public void setData(List<T> data) { this.data = data; }
    public void setHasMore(boolean hasMore) { this.hasMore = hasMore; }
    public void setNextCursor(String nextCursor) { this.nextCursor = nextCursor; }
}
