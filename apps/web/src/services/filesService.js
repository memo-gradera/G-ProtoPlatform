import { base44 } from '@/api/base44Client';
import { isDevDataBypassEnabled } from '@/lib/devDataStore';

export class FileUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileUploadError';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new FileUploadError('Screenshot upload failed. Please try again.'));
    reader.readAsDataURL(file);
  });
}

export const filesService = {
  /**
   * @param {File | null | undefined} file
   * @returns {Promise<string>} Public URL for the uploaded screenshot
   */
  async uploadPrototypeScreenshot(file) {
    if (!file) {
      throw new FileUploadError('No file selected.');
    }

    if (isDevDataBypassEnabled()) {
      const dataUrl = await readFileAsDataUrl(file);
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        throw new FileUploadError(
          'Upload completed but no file URL was returned. Please try again.',
        );
      }
      return dataUrl;
    }

    let result;
    try {
      result = await base44.integrations.Core.UploadFile({ file });
    } catch (error) {
      throw new FileUploadError(
        error?.message || 'Screenshot upload failed. Please try again.',
      );
    }

    const fileUrl = result?.file_url;
    if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
      throw new FileUploadError(
        'Upload completed but no file URL was returned. Please try again.',
      );
    }

    return fileUrl.trim();
  },
};
