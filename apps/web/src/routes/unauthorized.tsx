import { createRoute } from '@tanstack/react-router';

import { UnauthorizedPage } from '../pages/unauthorized/UnauthorizedPage';
import { rootRoute } from './__root';

export const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
});
