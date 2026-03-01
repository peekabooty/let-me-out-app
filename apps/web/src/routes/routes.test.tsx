import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { authRoute } from '../routes/_auth';
import { dashboardRoute } from '../routes/_auth.index';
import { publicRoute } from '../routes/_public';
import { loginRoute } from '../routes/_public.login';
import { rootRoute } from '../routes/__root';
import { useAuthStore } from '../store/auth.store';

const mockUser = {
  id: '01234567-89ab-7def-0123-456789abcdef',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: 'EMPLOYEE' as const,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function buildRouter(initialPath: string) {
  const routeTree = rootRoute.addChildren([
    publicRoute.addChildren([loginRoute]),
    authRoute.addChildren([dashboardRoute]),
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

describe('Guard de navegacion: ruta autenticada', () => {
  it('redirige a /login cuando no hay sesion activa', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const router = buildRouter('/');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.queryByText('Iniciar sesión')).toBeInTheDocument();
    });
  });

  it('muestra el dashboard cuando hay sesion activa', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    const router = buildRouter('/');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});

describe('Guard de navegacion: ruta publica', () => {
  it('muestra /login cuando no hay sesion activa', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const router = buildRouter('/login');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    });
  });

  it('redirige al dashboard cuando ya hay sesion activa en /login', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    const router = buildRouter('/login');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
