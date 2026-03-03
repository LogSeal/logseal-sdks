export class ViewerError extends Error {
  public readonly code: string;
  public readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ViewerError';
    this.code = code;
    this.status = status;
  }

  static unauthorized(message = 'Invalid or expired viewer token') {
    return new ViewerError(message, 'unauthorized', 401);
  }

  static forbidden(message = 'Access denied') {
    return new ViewerError(message, 'forbidden', 403);
  }

  static notFound(message = 'Resource not found') {
    return new ViewerError(message, 'not_found', 404);
  }

  static rateLimited(message = 'Rate limit exceeded') {
    return new ViewerError(message, 'rate_limited', 429);
  }

  static serverError(message = 'Server error') {
    return new ViewerError(message, 'server_error', 500);
  }

  static networkError(message = 'Network error') {
    return new ViewerError(message, 'network_error');
  }

  static fromResponse(status: number, body: { error?: { message?: string; code?: string } }) {
    const message = body?.error?.message || `Request failed with status ${status}`;
    const code = body?.error?.code || 'api_error';
    return new ViewerError(message, code, status);
  }
}
