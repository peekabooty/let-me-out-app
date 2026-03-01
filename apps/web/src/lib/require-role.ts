import { redirect } from '@tanstack/react-router';

import type { UserRole } from '../store/auth.store';
import { useAuthStore } from '../store/auth.store';

/**
 * Throws a redirect to /unauthorized if the current user's role
 * is not included in the allowed roles list.
 *
 * Intended to be called inside a route's beforeLoad callback.
 */
export function requireRole(allowedRoles: UserRole[]): void {
  const { user } = useAuthStore.getState();

  if (!user || !allowedRoles.includes(user.role)) {
    throw redirect({ to: '/unauthorized' });
  }
}
