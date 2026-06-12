import { getApiBaseUrl } from '@/auth/msalConfig';
import { acquireAccessToken } from '@/auth/tokenProvider';

export class ApiClientError extends Error {
  /**
   * @param {'unauthorized' | 'forbidden' | 'not_provisioned' | 'network' | 'unknown'} type
   * @param {string} message
   * @param {number} [status]
   * @param {unknown} [details]
   */
  constructor(type, message, status, details) {
    super(message);
    this.name = 'ApiClientError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

const UNPROVISIONED_MESSAGE =
  'User is not provisioned in GRADERA Innovation Hub.';

function normalizeErrorType(status, message) {
  if (status === 401) return 'unauthorized';
  if (status === 403) {
    if (message?.includes('not provisioned')) return 'not_provisioned';
    return 'forbidden';
  }
  return 'unknown';
}

function toastMessageForError(error) {
  if (error.type === 'unauthorized') {
    return 'Your session expired. Please sign in again.';
  }
  if (error.type === 'not_provisioned' || error.type === 'forbidden') {
    return error.message || UNPROVISIONED_MESSAGE;
  }
  if (error.type === 'network') {
    return 'Unable to reach the GRADERA API. Check your connection.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

/**
 * @param {string} method
 * @param {string} path
 * @param {object} [options]
 */
export async function apiRequest(method, path, options = {}) {
  const { body, accessToken, headers = {} } = options;
  const token =
    accessToken !== undefined ? accessToken : await acquireAccessToken();

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new ApiClientError(
      'network',
      'Unable to reach the GRADERA API.',
    );
    error.toastMessage = toastMessageForError(error);
    throw error;
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;
    const type = normalizeErrorType(response.status, message);
    const error = new ApiClientError(type, message, response.status, payload);
    error.toastMessage = toastMessageForError(error);
    throw error;
  }

  return payload?.data !== undefined ? payload.data : payload;
}

export const apiClient = {
  get(path, options) {
    return apiRequest('GET', path, options);
  },
  post(path, body, options = {}) {
    return apiRequest('POST', path, { ...options, body });
  },
  patch(path, body, options = {}) {
    return apiRequest('PATCH', path, { ...options, body });
  },
  delete(path, options) {
    return apiRequest('DELETE', path, options);
  },
};
