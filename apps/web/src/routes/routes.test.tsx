import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { UserRole } from '@repo/types';
import { authRoute } from '../routes/_auth';
import { adminRoute } from '../routes/_auth.admin';
import { adminIndexRoute } from '../routes/_auth.admin.index';
import { dashboardRoute } from '../routes/_auth.index';
import { publicRoute } from '../routes/_public';
import { loginRoute } from '../routes/_public.login';
import { rootRoute } from '../routes/__root';
import { unauthorizedRoute } from '../routes/unauthorized';
import { useAuthStore } from '../store/auth.store';

const mockUser = {
  id: '01234567-89ab-7def-0123-456789abcdef',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: UserRole.STANDARD,
  isActive: true,
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
    authRoute.addChildren([dashboardRoute, adminRoute.addChildren([adminIndexRoute])]),
    unauthorizedRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

function renderRouter(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter(initialPath);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { router };
}

describe('Guard de navegacion: ruta autenticada', () => {
  it('redirige a /login cuando no hay sesion activa', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    renderRouter('/');

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

    renderRouter('/');

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

    renderRouter('/login');

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

    renderRouter('/login');

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});

describe('Guard de rol: ruta de administracion', () => {
  it('muestra la pagina de admin cuando el usuario es ADMIN', async () => {
    const adminUser = { ...mockUser, role: UserRole.ADMIN };
    server.use(
      http.get('*/auth/me', () => HttpResponse.json(adminUser)),
      http.get('*/users', () => HttpResponse.json([]))
    );

    renderRouter('/admin');

    await waitFor(() => {
      expect(screen.getByText('Usuarios')).toBeInTheDocument();
    });
  });

  it('redirige a /unauthorized cuando el usuario no es ADMIN', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    renderRouter('/admin');

    await waitFor(() => {
      expect(screen.getByText('Acceso no permitido')).toBeInTheDocument();
    });
  });
});
