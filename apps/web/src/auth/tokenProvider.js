import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { getApiScope } from '@/auth/msalConfig';
import { getMsalInstance } from '@/auth/msalInstance';
import { isMsalAuthMode } from '@/lib/authMode';

export async function acquireAccessToken() {
  if (!isMsalAuthMode()) {
    return null;
  }

  const msal = await getMsalInstance();
  if (!msal) {
    return null;
  }

  const account =
    msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;

  if (!account) {
    return null;
  }

  const scope = getApiScope();
  const tokenRequest = { scopes: [scope], account };

  try {
    const result = await msal.acquireTokenSilent(tokenRequest);
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) {
      throw error;
    }
  }

  try {
    const popupResult = await msal.acquireTokenPopup(tokenRequest);
    return popupResult.accessToken;
  } catch {
    await msal.acquireTokenRedirect(tokenRequest);
    return null;
  }
}

export async function loginWithMicrosoft() {
  const msal = await getMsalInstance();
  if (!msal) {
    throw new Error('MSAL is not configured.');
  }

  await msal.loginRedirect({
    scopes: [getApiScope()],
  });
}

export async function logoutFromMicrosoft() {
  const msal = await getMsalInstance();
  if (!msal) return;

  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  await msal.logoutRedirect({
    account,
    postLogoutRedirectUri: `${window.location.origin}/login`,
  });
}

export async function handleMsalRedirect() {
  const msal = await getMsalInstance();
  if (!msal) return null;

  const result = await msal.handleRedirectPromise();
  const account = result?.account ?? msal.getAllAccounts()[0] ?? null;

  if (account) {
    msal.setActiveAccount(account);
  }

  return account;
}
