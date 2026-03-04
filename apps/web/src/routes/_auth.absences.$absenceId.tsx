import { createRoute } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import { requireRole } from '../lib/require-role';
import { AbsenceDetailPage } from '../pages/absences/AbsenceDetailPage';
import { authRoute } from './_auth';

export const absenceDetailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/absences/$absenceId',
  beforeLoad: () => {
    requireRole([UserRole.STANDARD, UserRole.VALIDATOR, UserRole.AUDITOR]);
  },
  component: AbsenceDetailPage,
});
