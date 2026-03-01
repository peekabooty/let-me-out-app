import { createRoute } from '@tanstack/react-router';

import { requireRole } from '../lib/require-role';
import { authRoute } from './_auth';

export const adminRoute = createRoute({
  getParentRoute: () => authRoute,
  id: '_admin',
  beforeLoad: () => {
    requireRole(['ADMIN']);
  },
});
