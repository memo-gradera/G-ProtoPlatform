import { getAuthProvider } from '@/lib/authMode';
import { isAuthDebugEnabled } from '@/auth/authDebug';

export function logAuthLifecycle(event, details = {}) {
  if (!isAuthDebugEnabled()) return;

  console.info(`[GRADERA AuthContext] ${event}`, {
    authMode: getAuthProvider(),
    ...details,
  });
}
