import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/lib/appVersion';
import { GRADERA_LOGO_SRC } from '@/lib/logoAsset';

describe('appVersion', () => {
  it('exposes a semver-style version string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe('0.1.1');
  });
});

describe('GraderaLogo asset', () => {
  it('uses a cache-busted logo source', () => {
    expect(GRADERA_LOGO_SRC).toBe('/gradera-logo.svg?v=3');
  });
});
