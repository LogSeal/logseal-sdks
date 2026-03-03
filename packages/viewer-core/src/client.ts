import { DEFAULT_BASE_URL } from './constants.js';
import { ViewerError } from './errors.js';
import type {
  AuditEvent,
  CreateExportParams,
  Export,
  ListEventsParams,
  PaginatedList,
  ViewerClientConfig,
} from './types.js';
import { toSnakeCaseParams } from './utils.js';
import { VERSION } from './version.js';

export class ViewerClient {
  private token: string;
  private readonly baseUrl: string;
  private readonly onTokenExpired?: () => Promise<string> | string;

  constructor(config: ViewerClientConfig) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.onTokenExpired = config.onTokenExpired;
  }

  /** Update the token (e.g., after refresh) */
  setToken(token: string): void {
    this.token = token;
  }

  /** List audit events with optional filters */
  async listEvents(
    params: ListEventsParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedList<AuditEvent>> {
    const query = toSnakeCaseParams(params as Record<string, unknown>);
    return this.request<PaginatedList<AuditEvent>>('/v1/events', query, signal);
  }

  /** Get distinct action types */
  async getActions(signal?: AbortSignal): Promise<{ data: string[]; object: 'list' }> {
    return this.request<{ data: string[]; object: 'list' }>(
      '/v1/events/actions',
      {},
      signal,
    );
  }

  /** Create an export */
  async createExport(
    params: CreateExportParams,
    signal?: AbortSignal,
  ): Promise<Export> {
    const body: Record<string, unknown> = { format: params.format };
    if (params.filters) {
      body.filters = toSnakeCaseParams(params.filters as Record<string, unknown>);
    }
    return this.requestPost<Export>('/v1/exports', body, signal);
  }

  /** Get export status */
  async getExport(id: string, signal?: AbortSignal): Promise<Export> {
    return this.request<Export>(`/v1/exports/${encodeURIComponent(id)}`, {}, signal);
  }

  private async request<T>(
    path: string,
    query: Record<string, string>,
    signal?: AbortSignal,
    isRetry = false,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchWithAuth(url.toString(), 'GET', undefined, signal);

    if (response.status === 401 && !isRetry && this.onTokenExpired) {
      const newToken = await this.onTokenExpired();
      this.token = newToken;
      return this.request<T>(path, query, signal, true);
    }

    return this.handleResponse<T>(response);
  }

  private async requestPost<T>(
    path: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    isRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithAuth(
      url,
      'POST',
      JSON.stringify(body),
      signal,
    );

    if (response.status === 401 && !isRetry && this.onTokenExpired) {
      const newToken = await this.onTokenExpired();
      this.token = newToken;
      return this.requestPost<T>(path, body, signal, true);
    }

    return this.handleResponse<T>(response);
  }

  private async fetchWithAuth(
    url: string,
    method: string,
    body?: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-LogSeal-Viewer': VERSION,
        },
        body,
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw ViewerError.networkError(
        error instanceof Error ? error.message : 'Network error',
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let body: { error?: { message?: string; code?: string } };
      try {
        body = (await response.json()) as typeof body;
      } catch {
        body = {};
      }
      throw ViewerError.fromResponse(response.status, body);
    }

    return (await response.json()) as T;
  }
}
