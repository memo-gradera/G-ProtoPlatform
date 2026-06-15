import { describe, expect, it } from 'vitest';
import {
  applyScreenshotUrlsToPrototypeForm,
  getCoverScreenshotUrl,
  getPrototypeCoverState,
  MAX_PROTOTYPE_SCREENSHOTS,
  validatePrototypeScreenshotSelection,
} from '@/lib/prototypeScreenshots';

describe('prototypeScreenshots', () => {
  it('rejects more than 5 screenshots including existing thumbnails', () => {
    const files = Array.from({ length: 3 }, (_item, index) => ({
      name: `shot-${index}.png`,
      type: 'image/png',
    }));

    const result = validatePrototypeScreenshotSelection(files, 3);

    expect(result.valid).toBe(false);
    expect(result.message).toContain(String(MAX_PROTOTYPE_SCREENSHOTS));
  });

  it('uses the first screenshot as cover URL', () => {
    const screenshots = [
      { url: 'https://example.com/cover.png' },
      { url: 'https://example.com/detail.png' },
    ];

    expect(getCoverScreenshotUrl(screenshots)).toBe('https://example.com/cover.png');
    expect(
      applyScreenshotUrlsToPrototypeForm({ name: 'Demo' }, screenshots).screenshot_url,
    ).toBe('https://example.com/cover.png');
  });

  it('renders image cover when screenshot_url exists', () => {
    expect(
      getPrototypeCoverState({ name: 'Alpha', screenshot_url: 'https://example.com/a.png' }),
    ).toEqual({
      showImage: true,
      screenshotUrl: 'https://example.com/a.png',
      fallbackInitial: 'A',
    });
  });

  it('falls back to initial letter when screenshot_url is missing or image failed', () => {
    expect(getPrototypeCoverState({ name: 'Beta' })).toEqual({
      showImage: false,
      screenshotUrl: '',
      fallbackInitial: 'B',
    });

    expect(
      getPrototypeCoverState(
        { name: 'Beta', screenshot_url: 'https://example.com/broken.png' },
        true,
      ),
    ).toEqual({
      showImage: false,
      screenshotUrl: 'https://example.com/broken.png',
      fallbackInitial: 'B',
    });
  });
});
