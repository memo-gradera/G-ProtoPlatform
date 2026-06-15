export const MAX_PROTOTYPE_VIDEO_URLS = 5;

export const PROTOTYPE_CATEGORY_OPTIONS = Object.freeze([
  { value: 'ai_ml', label: 'AI / ML' },
  { value: 'automation', label: 'Automation' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'ux', label: 'UX' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'integration', label: 'Integration' },
  { value: 'client_delivery_optimization', label: 'Client Delivery Optimization' },
  { value: 'other', label: 'Other' },
]);

export function getPrototypeCategoryLabel(category) {
  return (
    PROTOTYPE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category?.replace(/_/g, ' ') ??
    ''
  );
}

export function getPrimaryVideoUrl(prototype) {
  const urls = prototype?.video_urls;
  if (!Array.isArray(urls) || urls.length === 0) return '';
  return urls.find((url) => typeof url === 'string' && url.trim())?.trim() ?? '';
}

/**
 * @param {string[]} videoUrls
 * @param {number} [max=MAX_PROTOTYPE_VIDEO_URLS]
 */
export function createEmptyVideoUrlFields(videoUrls = [], max = MAX_PROTOTYPE_VIDEO_URLS) {
  const slots = Math.max(1, Math.min(max, videoUrls.length || 1));
  const fields = videoUrls.slice(0, max);
  while (fields.length < slots) {
    fields.push('');
  }
  return fields;
}
