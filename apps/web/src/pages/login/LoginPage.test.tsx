import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { UserRole } from '@repo/types';
import { authRoute } from '../../routes/_auth';
import { dashboardRoute } from '../../routes/_auth.index';
import { publicRoute } from '../../routes/_public';
import { loginRoute } from '../../routes/_public.login';
import { rootRoute } from '../../routes/__root';
import { useAuthStore } from '../../store/auth.store';

const mockUser = {
  id: '01234567-89ab-7def-0123-456789abcdef',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: UserRole.STANDARD,
  isActive: true,
};

const server = setupServer(http.get('*/auth/me', () => new HttpResponse(null, { status: 401 })));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function buildRouter() {
  const routeTree = rootRoute.addChildren([
    publicRoute.addChildren([loginRoute]),
    authRoute.addChildren([dashboardRoute]),
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  });
}

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = buildRouter();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { router };
}

describe('LoginPage', () => {
  it('renders the login form with email and password fields', async () => {
    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Correo electrónico'), 'not-an-email');
    await user.type(screen.getByLabelText('Contraseña'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows API error message on 401 response', async () => {
    server.use(http.post('*/auth/login', () => new HttpResponse(null, { status: 401 })));

    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas.')).toBeInTheDocument();
    });
  });

  it('shows generic error message on unexpected API error', async () => {
    server.use(http.post('*/auth/login', () => new HttpResponse(null, { status: 500 })));

    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Error inesperado. Inténtalo de nuevo.')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard after successful login', async () => {
    // First /auth/me call (root beforeLoad) returns 401 → login page shown.
    // Second call (post-login fetchMe) returns the user → dashboard rendered.
    server.use(
      http.post('*/auth/login', () => HttpResponse.json({ success: true })),
      http.get('*/auth/me', () => new HttpResponse(null, { status: 401 }), { once: true }),
      http.get('*/auth/me', () => HttpResponse.json(mockUser))
    );

    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correctpassword');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
