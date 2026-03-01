import { createRouter } from '@tanstack/react-router';

import { authRoute } from './routes/_auth';
import { dashboardRoute } from './routes/_auth.index';
import { publicRoute } from './routes/_public';
import { loginRoute } from './routes/_public.login';
import { rootRoute } from './routes/__root';

const routeTree = rootRoute.addChildren([
  publicRoute.addChildren([loginRoute]),
  authRoute.addChildren([dashboardRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
