import { DEFAULT_PAGE_SIZE } from './constants.js';
import type { ViewerClient } from './client.js';
import type { EventStoreConfig, ViewerFilters, ViewerState } from './types.js';

type Listener = () => void;

export class EventStore {
  private readonly client: ViewerClient;
  private readonly pageSize: number;
  private listeners = new Set<Listener>();
  private abortController: AbortController | null = null;
  private nextCursor: string | undefined;

  private state: ViewerState;

  constructor(config: EventStoreConfig) {
    this.client = config.client;
    this.pageSize = config.pageSize || DEFAULT_PAGE_SIZE;
    this.state = {
      events: [],
      actions: [],
      loading: false,
      loadingMore: false,
      error: null,
      hasMore: false,
      filters: config.initialFilters || {},
    };
  }

  /** useSyncExternalStore-compatible subscribe */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** useSyncExternalStore-compatible getSnapshot */
  getSnapshot = (): ViewerState => {
    return this.state;
  };

  /** Fetch first page of events + available actions in parallel */
  async loadInitial(): Promise<void> {
    this.abortPending();
    const controller = new AbortController();
    this.abortController = controller;

    this.setState({ loading: true, error: null, events: [], hasMore: false });

    try {
      const [eventsResult, actionsResult] = await Promise.all([
        this.client.listEvents(
          {
            ...this.filtersToParams(),
            limit: this.pageSize,
          },
          controller.signal,
        ),
        this.client.getActions(controller.signal),
      ]);

      this.nextCursor =
        eventsResult.has_more && eventsResult.data.length > 0
          ? eventsResult.data[eventsResult.data.length - 1].id
          : undefined;

      this.setState({
        events: eventsResult.data,
        actions: actionsResult.data,
        hasMore: eventsResult.has_more,
        loading: false,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load events',
        loading: false,
      });
    }
  }

  /** Append next page of events via cursor */
  async loadMore(): Promise<void> {
    if (!this.nextCursor || this.state.loadingMore || this.state.loading) return;

    const controller = new AbortController();
    this.abortController = controller;

    this.setState({ loadingMore: true, error: null });

    try {
      const result = await this.client.listEvents(
        {
          ...this.filtersToParams(),
          limit: this.pageSize,
          startingAfter: this.nextCursor,
        },
        controller.signal,
      );

      this.nextCursor =
        result.has_more && result.data.length > 0
          ? result.data[result.data.length - 1].id
          : undefined;

      this.setState({
        events: [...this.state.events, ...result.data],
        hasMore: result.has_more,
        loadingMore: false,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load more events',
        loadingMore: false,
      });
    }
  }

  /** Replace filters, reset events, re-fetch */
  async setFilters(filters: ViewerFilters): Promise<void> {
    this.setState({ filters });
    await this.loadInitial();
  }

  /** Re-fetch with current filters */
  async refresh(): Promise<void> {
    await this.loadInitial();
  }

  /** Abort in-flight requests and clear listeners */
  destroy(): void {
    this.abortPending();
    this.listeners.clear();
  }

  private filtersToParams(): Record<string, string | undefined> {
    const { action, actorId, after, before } = this.state.filters;
    return { action, actorId, after, before };
  }

  private setState(partial: Partial<ViewerState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private abortPending(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
