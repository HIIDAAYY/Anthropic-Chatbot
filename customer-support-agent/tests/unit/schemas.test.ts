import { describe, expect, it } from 'vitest';
import { LoginSchema, ResetPasswordSchema } from '@/app/lib/schemas/auth';
import { ConversationsListQuerySchema } from '@/app/lib/schemas/admin';

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const parsed = LoginSchema.parse({ username: 'admin', password: 'pass' });
    expect(parsed.username).toBe('admin');
  });

  it('rejects empty username', () => {
    expect(() => LoginSchema.parse({ username: '', password: 'x' })).toThrow();
  });

  it('trims whitespace on username', () => {
    const parsed = LoginSchema.parse({ username: '  admin  ', password: 'x' });
    expect(parsed.username).toBe('admin');
  });
});

describe('ResetPasswordSchema', () => {
  it('requires at least 8-char password', () => {
    expect(() =>
      ResetPasswordSchema.parse({ username: 'u', newPassword: 'short' })
    ).toThrow();
  });

  it('accepts 8+ char password', () => {
    const parsed = ResetPasswordSchema.parse({ username: 'u', newPassword: 'longenough' });
    expect(parsed.newPassword).toBe('longenough');
  });
});

describe('ConversationsListQuerySchema', () => {
  it('applies defaults', () => {
    const parsed = ConversationsListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it('coerces string numbers', () => {
    const parsed = ConversationsListQuerySchema.parse({ page: '3', limit: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
  });

  it('rejects limit > 100', () => {
    expect(() => ConversationsListQuerySchema.parse({ limit: '101' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => ConversationsListQuerySchema.parse({ status: 'FOO' })).toThrow();
  });

  it('accepts ALL status', () => {
    const parsed = ConversationsListQuerySchema.parse({ status: 'ALL' });
    expect(parsed.status).toBe('ALL');
  });
});
