import { createRoute } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import { requireRole } from '../lib/require-role';
import { AbsenceNewPage } from '../pages/absences/AbsenceNewPage';
import { authRoute } from './_auth';

export const absenceNewRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/absences/new',
  beforeLoad: () => {
    requireRole([UserRole.STANDARD, UserRole.VALIDATOR]);
  },
  component: AbsenceNewPage,
});
