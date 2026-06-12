import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { getApiScope } from '@/auth/msalConfig';
import { getMsalInstance } from '@/auth/msalInstance';
import { logMsalTokenDiagnostics } from '@/auth/jwtDebug';
import { isAuthDebugEnabled } from '@/auth/authDebug';
import { isMsalAuthMode } from '@/lib/authMode';

let msalInteractionInProgress = false;

export function isMsalInteractionInProgress() {
  return msalInteractionInProgress;
}

function ensureActiveMsalAccount(msal) {
  const activeAccount = msal.getActiveAccount();
  if (activeAccount) {
    return activeAccount;
  }

  const accounts = msal.getAllAccounts();
  if (accounts.length === 1) {
    msal.setActiveAccount(accounts[0]);
    return accounts[0];
  }

  return accounts[0] ?? null;
}

function logTokenFailure(context, account) {
  if (!isAuthDebugEnabled()) return;

  console.info(`[GRADERA MSAL] ${context}`, {
    tokenAcquired: false,
    account: account
      ? {
          username: account.username,
          homeAccountId: account.homeAccountId,
        }
      : null,
  });
}

export async function getMsalAccountDiagnostics() {
  const msal = await getMsalInstance();
  if (!msal) {
    return { accountCount: 0, activeUsername: null };
  }

  const accounts = msal.getAllAccounts();
  const active = msal.getActiveAccount();

  return {
    accountCount: accounts.length,
    activeUsername: active?.username ?? accounts[0]?.username ?? null,
  };
}

export async function acquireAccessToken() {
  if (!isMsalAuthMode()) {
    logTokenFailure('acquireAccessToken — not MSAL mode', null);
    return null;
  }

  const msal = await getMsalInstance();
  if (!msal) {
    console.warn('[GRADERA MSAL] MSAL is not configured.');
    logTokenFailure('acquireAccessToken — MSAL not configured', null);
    return null;
  }

  const account = ensureActiveMsalAccount(msal);

  if (!account) {
    logTokenFailure('acquireAccessToken — no account', null);
    return null;
  }

  const scope = getApiScope();
  const tokenRequest = { scopes: [scope], account };

  try {
    const result = await msal.acquireTokenSilent(tokenRequest);
    logMsalTokenDiagnostics('acquireTokenSilent', account, result.accessToken);
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) {
      console.error('[GRADERA MSAL] Token acquisition failed:', error);
      throw error;
    }
  }

  try {
    const popupResult = await msal.acquireTokenPopup(tokenRequest);
    logMsalTokenDiagnostics('acquireTokenPopup', account, popupResult.accessToken);
    return popupResult.accessToken;
  } catch (popupError) {
    console.warn('[GRADERA MSAL] Popup token failed, redirecting:', popupError);
    await msal.acquireTokenRedirect(tokenRequest);
    return null;
  }
}

export async function loginWithMicrosoft() {
  if (msalInteractionInProgress) {
    return;
  }

  const msal = await getMsalInstance();
  if (!msal) {
    throw new Error(
      'MSAL is not configured. Check VITE_AZURE_TENANT_ID, VITE_AZURE_CLIENT_ID, and VITE_API_SCOPE.',
    );
  }

  msalInteractionInProgress = true;
  try {
    await msal.loginRedirect({
      scopes: [getApiScope()],
    });
  } catch (error) {
    msalInteractionInProgress = false;
    throw error;
  }
}

export async function logoutFromMicrosoft() {
  const msal = await getMsalInstance();
  if (!msal) return;

  msalInteractionInProgress = false;
  const account = ensureActiveMsalAccount(msal);
  await msal.logoutRedirect({
    account,
    postLogoutRedirectUri: `${window.location.origin}/login`,
  });
}

export async function handleMsalRedirect() {
  const msal = await getMsalInstance();
  if (!msal) {
    return null;
  }

  const result = await msal.handleRedirectPromise();
  msalInteractionInProgress = false;

  if (result?.account) {
    msal.setActiveAccount(result.account);
  }

  const account = result?.account ?? ensureActiveMsalAccount(msal);

  if (result?.accessToken) {
    logMsalTokenDiagnostics('handleRedirectPromise', account, result.accessToken);
  }

  return account;
}
