import { createRoute } from '@tanstack/react-router';

import { AdminPage } from '../pages/admin/AdminPage';
import { adminRoute } from './_auth.admin';

export const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/admin',
  component: AdminPage,
});
