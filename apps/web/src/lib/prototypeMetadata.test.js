import { describe, expect, it } from 'vitest';
import {
  createEmptyVideoUrlFields,
  getPrimaryVideoUrl,
  getPrototypeCategoryLabel,
  MAX_PROTOTYPE_VIDEO_URLS,
} from '@/lib/prototypeMetadata';

describe('prototypeMetadata', () => {
  it('returns readable category label for client_delivery_optimization', () => {
    expect(getPrototypeCategoryLabel('client_delivery_optimization')).toBe(
      'Client Delivery Optimization',
    );
  });

  it('returns first non-empty video URL', () => {
    expect(
      getPrimaryVideoUrl({
        video_urls: ['', 'https://loom.com/share/demo', 'https://youtube.com/watch?v=1'],
      }),
    ).toBe('https://loom.com/share/demo');
  });

  it('creates at least one empty video field', () => {
    expect(createEmptyVideoUrlFields([])).toEqual(['']);
    expect(createEmptyVideoUrlFields(['https://example.com/v1'])).toEqual([
      'https://example.com/v1',
    ]);
  });

  it('caps video fields at MAX_PROTOTYPE_VIDEO_URLS', () => {
    const urls = Array.from({ length: 6 }, (_, index) => `https://example.com/v${index}`);
    expect(createEmptyVideoUrlFields(urls).length).toBeLessThanOrEqual(
      MAX_PROTOTYPE_VIDEO_URLS,
    );
  });
});
