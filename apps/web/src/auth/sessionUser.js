/** In-memory session user for non-React callers (permissionGuard, services). */
let sessionUser = null;

export function setSessionUser(user) {
  sessionUser = user;
}

export function getSessionUser() {
  return sessionUser;
}

export function clearSessionUser() {
  sessionUser = null;
}
