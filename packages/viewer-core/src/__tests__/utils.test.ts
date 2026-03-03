import { describe, it, expect } from 'vitest';
import { toSnakeCase, toSnakeCaseParams, formatRelativeTime, formatDateTime } from '../utils.js';

describe('toSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('actionPrefix')).toBe('action_prefix');
    expect(toSnakeCase('startingAfter')).toBe('starting_after');
    expect(toSnakeCase('actorId')).toBe('actor_id');
  });

  it('leaves already snake_case unchanged', () => {
    expect(toSnakeCase('action')).toBe('action');
    expect(toSnakeCase('limit')).toBe('limit');
  });

  it('handles multiple uppercase letters', () => {
    expect(toSnakeCase('someHTTPHeader')).toBe('some_h_t_t_p_header');
  });
});

describe('toSnakeCaseParams', () => {
  it('converts keys and stringifies values', () => {
    const result = toSnakeCaseParams({
      actorId: 'user_1',
      limit: 25,
      actionPrefix: 'user.',
    });
    expect(result).toEqual({
      actor_id: 'user_1',
      limit: '25',
      action_prefix: 'user.',
    });
  });

  it('strips undefined and null values', () => {
    const result = toSnakeCaseParams({
      action: 'user.created',
      actorId: undefined,
      before: null,
    });
    expect(result).toEqual({ action: 'user.created' });
  });

  it('returns empty object for empty input', () => {
    expect(toSnakeCaseParams({})).toEqual({});
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-03T12:00:00Z').getTime();

  it('returns "just now" for recent times', () => {
    expect(formatRelativeTime('2026-03-03T11:59:30Z', now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeTime('2026-03-03T11:55:00Z', now)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeTime('2026-03-03T09:00:00Z', now)).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(formatRelativeTime('2026-03-01T12:00:00Z', now)).toBe('2d ago');
  });

  it('returns weeks ago', () => {
    expect(formatRelativeTime('2026-02-17T12:00:00Z', now)).toBe('2w ago');
  });

  it('returns months ago', () => {
    expect(formatRelativeTime('2026-01-01T12:00:00Z', now)).toBe('2mo ago');
  });

  it('returns years ago', () => {
    expect(formatRelativeTime('2024-03-03T12:00:00Z', now)).toBe('2y ago');
  });

  it('returns "just now" for future dates', () => {
    expect(formatRelativeTime('2026-03-04T12:00:00Z', now)).toBe('just now');
  });
});

describe('formatDateTime', () => {
  it('formats a date string in en-US locale', () => {
    const result = formatDateTime('2026-03-03T12:30:45Z', 'en-US');
    expect(result).toContain('2026');
    expect(result).toContain('Mar');
  });
});
