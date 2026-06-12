import { ROLES } from '@/domain/rbac';

export const DEV_ROLE_STORAGE_KEY = 'innovation_hub_dev_role';
export const DEV_BYPASS_LOGGED_OUT_KEY = 'innovation_hub_dev_logged_out';

/** @type {readonly string[]} */
export const DEV_ROLES = ROLES;

const DEFAULT_DEV_USER = Object.freeze({
  id: 'dev-user',
  email: 'memo@local.dev',
  full_name: 'Memo Developer',
});

export function isDevAuthBypassEnabled() {
  return import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
}

export function getDevRole() {
  if (typeof window === 'undefined') return 'admin';
  const stored = window.localStorage.getItem(DEV_ROLE_STORAGE_KEY);
  return DEV_ROLES.includes(stored) ? stored : 'admin';
}

/**
 * @param {string} role
 */
export function setDevRole(role) {
  if (!DEV_ROLES.includes(role)) return;
  window.localStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
  window.dispatchEvent(
    new CustomEvent('dev-user-role-changed', { detail: { role } }),
  );
}

export function isDevBypassLoggedOut() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(DEV_BYPASS_LOGGED_OUT_KEY) === 'true';
}

export function markDevBypassLoggedOut() {
  window.sessionStorage.setItem(DEV_BYPASS_LOGGED_OUT_KEY, 'true');
}

export function clearDevBypassLoggedOut() {
  window.sessionStorage.removeItem(DEV_BYPASS_LOGGED_OUT_KEY);
}

export function createDevUser() {
  return {
    ...DEFAULT_DEV_USER,
    role: getDevRole(),
  };
}
