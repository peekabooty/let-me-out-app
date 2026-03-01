import { createRoute } from '@tanstack/react-router';

import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { authRoute } from './_auth';

export const dashboardRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/',
  component: DashboardPage,
});
