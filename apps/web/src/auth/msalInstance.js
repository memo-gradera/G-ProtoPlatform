import { PublicClientApplication } from '@azure/msal-browser';
import { getMsalConfig, isMsalConfigured } from '@/auth/msalConfig';

let msalInstance = null;
let initPromise = null;

export async function getMsalInstance() {
  if (!isMsalConfigured()) {
    return null;
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication(getMsalConfig());
    initPromise = msalInstance.initialize();
  }

  await initPromise;
  return msalInstance;
}

/** Test helper */
export function resetMsalInstanceForTests() {
  msalInstance = null;
  initPromise = null;
}
