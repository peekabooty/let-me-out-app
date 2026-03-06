import { createRoute } from '@tanstack/react-router';

import { ActivatePage } from '../pages/activate/ActivatePage';
import { rootRoute } from './__root';

export const activateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activate',
  component: ActivatePage,
});
