import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  ViewerClient,
  EventStore,
  type ViewerFilters,
  type ViewerClientConfig,
} from '@logseal/viewer-core';
import type { UseAuditLogReturn } from '../types.js';

export interface UseAuditLogOptions {
  token: string;
  baseUrl?: string;
  onTokenExpired?: ViewerClientConfig['onTokenExpired'];
  pageSize?: number;
  filters?: ViewerFilters;
}

export function useAuditLog(options: UseAuditLogOptions): UseAuditLogReturn {
  const { token, baseUrl, onTokenExpired, pageSize, filters } = options;

  const storeRef = useRef<EventStore | null>(null);
  const clientRef = useRef<ViewerClient | null>(null);

  // Create client + store once, then update token as needed
  if (!clientRef.current) {
    clientRef.current = new ViewerClient({ token, baseUrl, onTokenExpired });
    storeRef.current = new EventStore({
      client: clientRef.current,
      pageSize,
      initialFilters: filters,
    });
  }

  // Keep token in sync
  useEffect(() => {
    clientRef.current?.setToken(token);
  }, [token]);

  const store = storeRef.current!;

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  // Load initial data on mount
  useEffect(() => {
    store.loadInitial();
    return () => store.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external filter changes
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (filters && filters !== prevFiltersRef.current) {
      prevFiltersRef.current = filters;
      store.setFilters(filters);
    }
  }, [filters, store]);

  const loadMore = useCallback(() => {
    store.loadMore();
  }, [store]);

  const setFilters = useCallback(
    (newFilters: ViewerFilters) => {
      store.setFilters(newFilters);
    },
    [store],
  );

  const refresh = useCallback(() => {
    store.refresh();
  }, [store]);

  return {
    ...state,
    loadMore,
    setFilters,
    refresh,
  };
}
