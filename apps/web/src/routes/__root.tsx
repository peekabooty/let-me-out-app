import { createRootRoute, Outlet } from '@tanstack/react-router';

import { fetchMe } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';

export const rootRoute = createRootRoute({
  beforeLoad: async () => {
    const { setUser, setLoading } = useAuthStore.getState();
    setLoading(true);
    try {
      const user = await fetchMe();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  },
  component: () => <Outlet />,
});
