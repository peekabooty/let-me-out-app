import { createRoute, redirect } from '@tanstack/react-router';

import { AuthLayout } from '../layouts/AuthLayout';
import { useAuthStore } from '../store/auth.store';
import { rootRoute } from './__root';

function AuthRouteComponent() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return null;
  }

  return <AuthLayout user={user} />;
}

export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthRouteComponent,
});
