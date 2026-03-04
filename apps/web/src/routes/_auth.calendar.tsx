import { createRoute } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import { requireRole } from '../lib/require-role';
import { CalendarPage } from '../pages/calendar/CalendarPage';
import { authRoute } from './_auth';

export const calendarRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/calendar',
  beforeLoad: () => {
    requireRole([UserRole.STANDARD, UserRole.VALIDATOR]);
  },
  component: CalendarPage,
});
