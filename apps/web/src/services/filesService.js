import { base44 } from '@/api/base44Client';
import { isDevDataBypassEnabled } from '@/lib/devDataStore';
import { isApiBackendEnabled } from '@/services/backendMode';
import { getApiBaseUrl } from '@/auth/msalConfig';
import { acquireAccessToken } from '@/auth/tokenProvider';

export class FileUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class FileUploadUnavailableError extends FileUploadError {
  constructor(
    message = 'File upload is not available in API mode yet. Use a URL or enable local mode.',
  ) {
    super(message);
    this.name = 'FileUploadUnavailableError';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new FileUploadError('Screenshot upload failed. Please try again.'));
    reader.readAsDataURL(file);
  });
}

async function uploadScreenshotsViaApi(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const token = await acquireAccessToken();
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}/prototypes/screenshots`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FileUploadError(
      payload?.message || 'Screenshot upload failed. Please try again.',
    );
  }

  const data = payload?.data ?? payload;
  const urls = Array.isArray(data?.urls) ? data.urls : [];
  if (!urls.length) {
    throw new FileUploadError(
      'Upload completed but no screenshot URLs were returned. Please try again.',
    );
  }

  return {
    urls,
    screenshot_url: data?.screenshot_url ?? urls[0],
  };
}

export const filesService = {
  /**
   * @param {File[]} files
   * @returns {Promise<{ urls: string[], screenshot_url: string }>}
   */
  async uploadPrototypeScreenshots(files) {
    if (!files?.length) {
      throw new FileUploadError('No files selected.');
    }

    if (isApiBackendEnabled()) {
      return uploadScreenshotsViaApi(files);
    }

    if (isDevDataBypassEnabled()) {
      const urls = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      return {
        urls,
        screenshot_url: urls[0],
      };
    }

    const urls = [];
    for (const file of files) {
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
      urls.push(fileUrl.trim());
    }

    return {
      urls,
      screenshot_url: urls[0],
    };
  },

  /**
   * @param {File | null | undefined} file
   * @returns {Promise<string>} Public URL for the uploaded screenshot
   */
  async uploadPrototypeScreenshot(file) {
    const { screenshot_url: screenshotUrl } = await this.uploadPrototypeScreenshots([file]);
    return screenshotUrl;
  },
};
