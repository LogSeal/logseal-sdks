import { describe, it, expect } from 'vitest';
import { LogSealError } from '../error.js';

describe('LogSealError', () => {
  it('preserves type, code, message, param, and docUrl', () => {
    const error = new LogSealError(
      {
        type: 'validation_error',
        code: 'missing_required_field',
        message: "The 'action' field is required.",
        param: 'action',
        doc_url: 'https://docs.logseal.dev/errors/missing_required_field',
      },
      400
    );

    expect(error.type).toBe('validation_error');
    expect(error.code).toBe('missing_required_field');
    expect(error.message).toBe("The 'action' field is required.");
    expect(error.param).toBe('action');
    expect(error.docUrl).toBe('https://docs.logseal.dev/errors/missing_required_field');
    expect(error.statusCode).toBe(400);
  });

  it('has name "LogSealError"', () => {
    const error = new LogSealError({
      type: 'internal_error',
      code: 'internal',
      message: 'Something went wrong.',
    });

    expect(error.name).toBe('LogSealError');
  });

  it('extends Error', () => {
    const error = new LogSealError({
      type: 'authentication_error',
      code: 'invalid_api_key',
      message: 'Invalid API key.',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LogSealError);
  });

  it('defaults statusCode to 400', () => {
    const error = new LogSealError({
      type: 'validation_error',
      code: 'invalid_param',
      message: 'Invalid parameter.',
    });

    expect(error.statusCode).toBe(400);
  });

  it('handles missing optional fields', () => {
    const error = new LogSealError({
      type: 'not_found_error',
      code: 'resource_not_found',
      message: 'Resource not found.',
    });

    expect(error.param).toBeUndefined();
    expect(error.docUrl).toBeUndefined();
  });

  it('serializes to JSON with correct structure', () => {
    const error = new LogSealError(
      {
        type: 'rate_limit_error',
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded.',
        param: 'events',
        doc_url: 'https://docs.logseal.dev/rate-limits',
      },
      429
    );

    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        type: 'rate_limit_error',
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded.',
        param: 'events',
        doc_url: 'https://docs.logseal.dev/rate-limits',
      },
    });
  });

  it('omits optional fields from JSON when not set', () => {
    const error = new LogSealError({
      type: 'internal_error',
      code: 'internal',
      message: 'Internal error.',
    });

    const json = error.toJSON();

    expect(json.error).not.toHaveProperty('param');
    expect(json.error).not.toHaveProperty('doc_url');
  });

  it('has a stack trace', () => {
    const error = new LogSealError({
      type: 'internal_error',
      code: 'internal',
      message: 'Something went wrong.',
    });

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('LogSealError');
  });
});
