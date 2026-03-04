import { createRoute } from '@tanstack/react-router';

import { AuditPage } from '../pages/audit/AuditPage';
import { auditRoute } from './_auth.audit';

export const auditIndexRoute = createRoute({
  getParentRoute: () => auditRoute,
  path: '/audit',
  component: AuditPage,
});
