import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@/app/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { withValidation, withQueryValidation } from '@/app/lib/validate-request';

const BodySchema = z.object({ username: z.string().min(1), age: z.number().int().min(0) });
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().optional(),
});

function jsonReq(body: unknown): Request {
  return new Request('http://t/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('withValidation', () => {
  it('calls handler with parsed data when valid', async () => {
    const handler = vi.fn(async (data: any) =>
      new Response(JSON.stringify({ got: data }), { status: 200 })
    );
    const wrapped = withValidation(BodySchema, handler);
    const res = await wrapped(jsonReq({ username: 'a', age: 1 }), undefined as never);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(await res.json()).toEqual({ got: { username: 'a', age: 1 } });
  });

  it('returns 400 with issues for invalid body', async () => {
    const handler = vi.fn();
    const wrapped = withValidation(BodySchema, handler);
    const res = await wrapped(jsonReq({ username: '', age: -1 }), undefined as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const handler = vi.fn();
    const wrapped = withValidation(BodySchema, handler);
    const req = new Request('http://t/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    const res = await wrapped(req, undefined as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('withQueryValidation', () => {
  it('coerces and defaults query params', async () => {
    const handler = vi.fn(async (data: any) =>
      new Response(JSON.stringify(data), { status: 200 })
    );
    const wrapped = withQueryValidation(QuerySchema, handler);
    const res = await wrapped(new Request('http://t/?page=3&q=hi'), undefined as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ page: 3, q: 'hi' });
  });

  it('uses default when param missing', async () => {
    const handler = vi.fn(async (data: any) =>
      new Response(JSON.stringify(data), { status: 200 })
    );
    const wrapped = withQueryValidation(QuerySchema, handler);
    const res = await wrapped(new Request('http://t/'), undefined as never);
    expect(await res.json()).toEqual({ page: 1 });
  });

  it('returns 400 for invalid param', async () => {
    const wrapped = withQueryValidation(QuerySchema, vi.fn());
    const res = await wrapped(new Request('http://t/?page=abc'), undefined as never);
    expect(res.status).toBe(400);
  });
});
