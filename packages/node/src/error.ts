export type ErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'not_found_error'
  | 'rate_limit_error'
  | 'idempotency_error'
  | 'validation_error'
  | 'internal_error';

export interface LogSealErrorData {
  type: ErrorType;
  code: string;
  message: string;
  param?: string;
  doc_url?: string;
}

export class LogSealError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly param?: string;
  public readonly docUrl?: string;
  public readonly statusCode: number;

  constructor(data: LogSealErrorData, statusCode: number = 400) {
    super(data.message);
    this.name = 'LogSealError';
    this.type = data.type;
    this.code = data.code;
    this.param = data.param;
    this.docUrl = data.doc_url;
    this.statusCode = statusCode;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogSealError);
    }
  }

  toJSON(): { error: LogSealErrorData } {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.param && { param: this.param }),
        ...(this.docUrl && { doc_url: this.docUrl }),
      },
    };
  }
}
