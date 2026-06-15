export const MAX_PROTOTYPE_SCREENSHOTS = 5;

export const ACCEPTED_SCREENSHOT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export const ACCEPTED_SCREENSHOT_ACCEPT =
  '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

/**
 * @param {File[]} files
 * @param {number} [existingCount=0]
 */
export function validatePrototypeScreenshotSelection(files, existingCount = 0) {
  if (!files?.length) {
    return { valid: false, message: 'No files selected.' };
  }

  const total = existingCount + files.length;
  if (total > MAX_PROTOTYPE_SCREENSHOTS) {
    return {
      valid: false,
      message: `You can upload up to ${MAX_PROTOTYPE_SCREENSHOTS} screenshots.`,
    };
  }

  for (const file of files) {
    const mime = file.type?.toLowerCase() ?? '';
    const name = file.name?.toLowerCase() ?? '';
    const hasAllowedMime = ACCEPTED_SCREENSHOT_MIME_TYPES.includes(mime);
    const hasAllowedExtension = /\.(png|jpe?g|webp)$/i.test(name);

    if (!hasAllowedMime && !hasAllowedExtension) {
      return {
        valid: false,
        message: 'Only PNG, JPG, JPEG, and WebP images are allowed.',
      };
    }
  }

  return { valid: true };
}

/**
 * @param {{ url: string }[]} screenshots
 */
export function getCoverScreenshotUrl(screenshots = []) {
  return screenshots[0]?.url ?? '';
}

/**
 * @param {object | null | undefined} prototype
 * @param {boolean} [imageLoadFailed=false]
 */
export function getPrototypeCoverState(prototype, imageLoadFailed = false) {
  const screenshotUrl = prototype?.screenshot_url?.trim();
  return {
    showImage: Boolean(screenshotUrl) && !imageLoadFailed,
    screenshotUrl: screenshotUrl ?? '',
    fallbackInitial: prototype?.name?.charAt(0) ?? '?',
  };
}

/**
 * Prepare form payload: first screenshot URL maps to screenshot_url for API schema.
 * @param {object} form
 * @param {{ url: string }[]} screenshots
 */
export function applyScreenshotUrlsToPrototypeForm(form, screenshots) {
  return {
    ...form,
    screenshot_url: getCoverScreenshotUrl(screenshots),
    screenshot_urls: screenshots.map((item) => item.url),
  };
}
