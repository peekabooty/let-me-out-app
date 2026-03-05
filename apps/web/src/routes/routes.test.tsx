import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { UserRole } from '@repo/types';
import type { ReactNode } from 'react';

import { authRoute } from '../routes/_auth';
import { adminRoute } from '../routes/_auth.admin';
import { adminIndexRoute } from '../routes/_auth.admin.index';
import { absenceDetailRoute } from '../routes/_auth.absences.$absenceId';
import { absenceNewRoute } from '../routes/_auth.absences.new';
import { calendarRoute } from '../routes/_auth.calendar';
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

const mockAdminUser = {
  ...mockUser,
  role: UserRole.ADMIN,
};

const mockValidatorUser = {
  ...mockUser,
  role: UserRole.VALIDATOR,
};

const server = setupServer(
  http.get('*/users', () => HttpResponse.json([])),
  http.get('*/absence-types', () => HttpResponse.json([])),
  http.get('*/teams', () => HttpResponse.json([])),
  http.get('*/absences/calendar', () => HttpResponse.json([])),
  http.get('*/dashboard', () =>
    HttpResponse.json({
      balances: [],
      upcomingAbsences: [],
      pendingValidations: [],
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function buildRouter(initialPath: string) {
  const routeTree = rootRoute.addChildren([
    publicRoute.addChildren([loginRoute]),
    authRoute.addChildren([
      dashboardRoute,
      calendarRoute,
      absenceNewRoute,
      absenceDetailRoute,
      adminRoute.addChildren([adminIndexRoute]),
    ]),
    unauthorizedRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('Guard de navegacion: ruta autenticada', () => {
  it('redirige a /login cuando no hay sesion activa', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const router = buildRouter('/');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

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
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

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
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

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
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});

describe('Guard de rol: ruta de administracion', () => {
  it('muestra la pagina de admin cuando el usuario es ADMIN', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockAdminUser);
      })
    );

    const router = buildRouter('/admin');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Usuarios', level: 2 })).toBeInTheDocument();
    });
  });

  it('redirige a /unauthorized cuando el usuario no es ADMIN', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    const router = buildRouter('/admin');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Acceso no permitido')).toBeInTheDocument();
    });
  });

  it('redirige a /unauthorized cuando el usuario es VALIDATOR', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockValidatorUser);
      })
    );

    const router = buildRouter('/admin');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Acceso no permitido')).toBeInTheDocument();
    });
  });
});

describe('Guard de rol: ruta de calendario', () => {
  it('muestra calendario para usuario STANDARD', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    const router = buildRouter('/calendar');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Calendario', level: 1 })).toBeInTheDocument();
    });
  });

  it('redirige a /unauthorized para usuario ADMIN', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockAdminUser);
      })
    );

    const router = buildRouter('/calendar');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Acceso no permitido')).toBeInTheDocument();
    });
  });
});

describe('Guard de rol: ruta de solicitar ausencia', () => {
  it('muestra el formulario de nueva ausencia para usuario STANDARD', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockUser);
      })
    );

    const router = buildRouter('/absences/new');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva ausencia' })).toBeInTheDocument();
    });
  });

  it('muestra el formulario de nueva ausencia para usuario VALIDATOR', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockValidatorUser);
      })
    );

    const router = buildRouter('/absences/new');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva ausencia' })).toBeInTheDocument();
    });
  });

  it('redirige a /unauthorized para usuario ADMIN', async () => {
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json(mockAdminUser);
      })
    );

    const router = buildRouter('/absences/new');
    render(<RouterProvider router={router} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Acceso no permitido')).toBeInTheDocument();
    });
  });
});
