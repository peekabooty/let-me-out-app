import { Theme } from '@repo/types';
import { createRootRoute, Outlet } from '@tanstack/react-router';

import { fetchMe } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { getThemeFromStorage } from '../themes/theme-definitions';

export const rootRoute = createRootRoute({
  beforeLoad: async () => {
    const { setUser, setLoading } = useAuthStore.getState();
    const { initTheme } = useThemeStore.getState();
    const cachedTheme = getThemeFromStorage();

    if (cachedTheme) {
      initTheme(cachedTheme);
    } else {
      initTheme(Theme.LIGHT);
    }

    setLoading(true);
    try {
      const user = await fetchMe();
      setUser(user);

      const backendTheme = user.themePreference ?? Theme.LIGHT;
      if (backendTheme !== cachedTheme) {
        initTheme(backendTheme);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  },
  component: () => <Outlet />,
});
