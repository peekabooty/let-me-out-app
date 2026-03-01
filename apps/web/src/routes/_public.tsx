import { createRoute, redirect } from '@tanstack/react-router';

import { PublicLayout } from '../layouts/PublicLayout';
import { useAuthStore } from '../store/auth.store';
import { rootRoute } from './__root';

export const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_public',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (user) {
      throw redirect({ to: '/' });
    }
  },
  component: PublicLayout,
});
