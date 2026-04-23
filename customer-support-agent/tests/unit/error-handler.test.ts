import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/error-monitor', () => ({
  errorMonitor: { alert: vi.fn().mockResolvedValue(undefined) },
}));

import {
  AppError,
  DatabaseError,
  ClaudeAPIError,
  RAGError,
  getUserFriendlyErrorMessage,
  retryWithBackoff,
  withErrorHandler,
  shouldFallbackToHuman,
} from '@/app/lib/error-handler';

describe('AppError subclasses', () => {
  it('preserves statusCode on AppError', () => {
    const e = new AppError('boom', 418);
    expect(e.statusCode).toBe(418);
    expect(e.isOperational).toBe(true);
  });

  it('marks ConfigError as non-operational', async () => {
    const { ConfigError } = await import('@/app/lib/error-handler');
    const e = new ConfigError('missing var');
    expect(e.isOperational).toBe(false);
  });
});

describe('getUserFriendlyErrorMessage', () => {
  it('returns Indonesian database message for DatabaseError', () => {
    const msg = getUserFriendlyErrorMessage(new DatabaseError('x'));
    expect(msg.toLowerCase()).toContain('sistem');
  });

  it('returns English claude message when language=en', () => {
    const msg = getUserFriendlyErrorMessage(new ClaudeAPIError('x'), 'en');
    expect(msg).toMatch(/AI system/i);
  });

  it('returns default message for generic Error', () => {
    const msg = getUserFriendlyErrorMessage(new Error('x'));
    expect(msg).toMatch(/support@/);
  });
});

describe('shouldFallbackToHuman', () => {
  it('true for RAGError and ClaudeAPIError', () => {
    expect(shouldFallbackToHuman(new RAGError('x'))).toBe(true);
    expect(shouldFallbackToHuman(new ClaudeAPIError('x'))).toBe(true);
  });

  it('false for generic Error', () => {
    expect(shouldFallbackToHuman(new Error('x'))).toBe(false);
  });

  it('true for DatabaseError with connection in message', () => {
    expect(shouldFallbackToHuman(new DatabaseError('connection refused'))).toBe(true);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => vi.useRealTimers());

  it('returns value on first success', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1 });
    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxRetries: 5, initialDelay: 1, factor: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws last error after maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(
      retryWithBackoff(fn, { maxRetries: 2, initialDelay: 1 })
    ).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('withErrorHandler', () => {
  it('forwards successful response', async () => {
    const handler = withErrorHandler(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const res = await handler(new Request('http://t/'), undefined as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('converts thrown AppError to JSON with its statusCode', async () => {
    const handler = withErrorHandler(async () => {
      throw new AppError('nope', 422);
    });
    const res = await handler(new Request('http://t/'), undefined as never);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'nope' });
  });

  it('returns generic 500 for non-operational error', async () => {
    const handler = withErrorHandler(async () => {
      throw new Error('boom');
    });
    const res = await handler(new Request('http://t/'), undefined as never);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
