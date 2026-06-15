/**
 * @param {{ full_name?: string, fullName?: string, email?: string } | null | undefined} user
 */
export function getUserDisplayName(user) {
  if (!user) return 'User';
  return user.full_name || user.fullName || user.email?.split('@')[0] || 'User';
}

/**
 * @param {{ full_name?: string, fullName?: string, email?: string } | null | undefined} user
 */
export function getUserInitials(user) {
  if (!user) return 'U';

  const name = user.full_name || user.fullName;
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = user.email || '';
  return email.slice(0, 2).toUpperCase() || 'U';
}
