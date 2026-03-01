import { createRoute } from '@tanstack/react-router';

import { LoginPage } from '../pages/login/LoginPage';
import { publicRoute } from './_public';

export const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/login',
  component: LoginPage,
});
