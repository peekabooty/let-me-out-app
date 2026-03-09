import { createRouter } from '@tanstack/react-router';

import { authRoute } from './routes/_auth';
import { adminRoute } from './routes/_auth.admin';
import { adminIndexRoute } from './routes/_auth.admin.index';
import { absenceDetailRoute } from './routes/_auth.absences.$absenceId';
import { absenceNewRoute } from './routes/_auth.absences.new';
import { auditRoute } from './routes/_auth.audit';
import { auditIndexRoute } from './routes/_auth.audit.index';
import { calendarRoute } from './routes/_auth.calendar';
import { dashboardRoute } from './routes/_auth.index';
import { publicRoute } from './routes/_public';
import { loginRoute } from './routes/_public.login';
import { rootRoute } from './routes/__root';
import { unauthorizedRoute } from './routes/unauthorized';
import { activateRoute } from './routes/activate';

const routeTree = rootRoute.addChildren([
  publicRoute.addChildren([loginRoute]),
  authRoute.addChildren([
    dashboardRoute,
    calendarRoute,
    absenceNewRoute,
    absenceDetailRoute,
    adminRoute.addChildren([adminIndexRoute]),
    auditRoute.addChildren([auditIndexRoute]),
  ]),
  unauthorizedRoute,
  activateRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
