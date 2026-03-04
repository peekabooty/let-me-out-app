import { createRoute } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import { requireRole } from '../lib/require-role';
import { authRoute } from './_auth';

export const auditRoute = createRoute({
  getParentRoute: () => authRoute,
  id: '_audit',
  beforeLoad: () => {
    requireRole([UserRole.AUDITOR]);
  },
});
