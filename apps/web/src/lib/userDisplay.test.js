import { describe, expect, it } from 'vitest';
import { getUserDisplayName, getUserInitials } from '@/lib/userDisplay';

describe('userDisplay', () => {
  it('uses full_name when available', () => {
    expect(
      getUserDisplayName({
        full_name: 'Alex Rivera',
        email: 'alex@gradera.ai',
      }),
    ).toBe('Alex Rivera');
  });

  it('falls back to email local part', () => {
    expect(getUserDisplayName({ email: 'viewer@example.com' })).toBe('viewer');
  });

  it('builds initials from first and last name', () => {
    expect(
      getUserInitials({
        full_name: 'Memo Developer',
        email: 'memo@local.dev',
      }),
    ).toBe('MD');
  });

  it('builds initials from email when name is missing', () => {
    expect(getUserInitials({ email: 'admin@gradera.local' })).toBe('AD');
  });
});
