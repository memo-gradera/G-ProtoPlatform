import { describe, expect, it } from 'vitest';
import {
  API_BASE_URL_MISSING_MESSAGE,
  deriveHealthUrl,
  resolveApiBaseUrl,
} from '@/lib/apiIntegrationCheck';

describe('apiIntegrationCheck', () => {
  it('returns null when VITE_API_BASE_URL is missing', () => {
    expect(resolveApiBaseUrl({})).toBeNull();
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '  ' })).toBeNull();
  });

  it('normalizes API base URL', () => {
    expect(
      resolveApiBaseUrl({ VITE_API_BASE_URL: 'http://localhost:3001/api/' }),
    ).toBe('http://localhost:3001/api');
  });

  it('derives health URL from API base URL', () => {
    expect(deriveHealthUrl('http://localhost:3001/api')).toBe(
      'http://localhost:3001/health',
    );
  });

  it('documents missing base URL message for smoke script', () => {
    expect(API_BASE_URL_MISSING_MESSAGE).toContain('VITE_API_BASE_URL');
  });
});
