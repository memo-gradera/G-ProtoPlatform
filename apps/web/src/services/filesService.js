import { base44 } from '@/api/base44Client';
import { isDevDataBypassEnabled } from '@/lib/devDataStore';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';

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

async function probeApiUploadEndpoint() {
  try {
    const probe = await apiClient.get('/files');
    if (probe?.status === 'not_implemented') {
      throw new FileUploadUnavailableError();
    }
    if (probe?.upload === false || probe?.available === false) {
      throw new FileUploadUnavailableError();
    }
  } catch (error) {
    if (error instanceof FileUploadUnavailableError) {
      throw error;
    }
    if (error?.status === 404 || error?.status === 501) {
      throw new FileUploadUnavailableError();
    }
    throw error;
  }
}

async function uploadViaApi(file) {
  await probeApiUploadEndpoint();

  const formData = new FormData();
  formData.append('file', file);

  const { getApiBaseUrl } = await import('@/auth/msalConfig');
  const { acquireAccessToken } = await import('@/auth/tokenProvider');
  const token = await acquireAccessToken();

  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 404 || response.status === 501) {
    throw new FileUploadUnavailableError();
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FileUploadError(
      payload?.message || 'Screenshot upload failed. Please try again.',
    );
  }

  const fileUrl = payload?.data?.file_url ?? payload?.file_url;
  if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
    throw new FileUploadUnavailableError();
  }

  return fileUrl.trim();
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

    if (isApiBackendEnabled()) {
      return uploadViaApi(file);
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
