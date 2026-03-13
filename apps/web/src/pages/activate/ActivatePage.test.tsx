import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { activateRoute } from '../../routes/activate';
import { rootRoute } from '../../routes/__root';
import { publicRoute } from '../../routes/_public';
import { loginRoute } from '../../routes/_public.login';
import { useAuthStore } from '../../store/auth.store';

const server = setupServer(http.get('*/auth/me', () => new HttpResponse(null, { status: 401 })));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function buildRouter(token?: string) {
  const path = token ? `/activate?token=${token}` : '/activate';

  const routeTree = rootRoute.addChildren([publicRoute.addChildren([loginRoute]), activateRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

function renderActivate(token?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = buildRouter(token);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { router };
}

const VALID_PASSWORD = 'Abcdef1!ghij';

describe('ActivatePage', () => {
  it('renders heading and password field', async () => {
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activa tu cuenta' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument();
  });

  it('renders all five policy checks in unchecked state initially', async () => {
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activa tu cuenta' })).toBeInTheDocument();
    });

    const list = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(list).toBeInTheDocument();

    expect(screen.getByText('Mínimo 12 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Al menos una letra mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Al menos una letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Al menos un número')).toBeInTheDocument();
    expect(screen.getByText('Al menos un símbolo')).toBeInTheDocument();
  });

  it('marks the length check as met when enough characters are typed', async () => {
    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    // Type exactly 12 chars (no other rules satisfied intentionally)
    await user.type(screen.getByLabelText('Contraseña'), 'aaaaaaaaaaaa');

    // The length item should now be styled as met (green text)
    const lengthItem = screen.getByText('Mínimo 12 caracteres');
    expect(lengthItem).toHaveClass('text-green-700');
  });

  it('marks the uppercase check as met when an uppercase letter is typed', async () => {
    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), 'A');

    expect(screen.getByText('Al menos una letra mayúscula')).toHaveClass('text-green-700');
  });

  it('marks the lowercase check as met when a lowercase letter is typed', async () => {
    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), 'a');

    expect(screen.getByText('Al menos una letra minúscula')).toHaveClass('text-green-700');
  });

  it('marks the number check as met when a digit is typed', async () => {
    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), '1');

    expect(screen.getByText('Al menos un número')).toHaveClass('text-green-700');
  });

  it('marks the symbol check as met when a symbol is typed', async () => {
    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), '!');

    expect(screen.getByText('Al menos un símbolo')).toHaveClass('text-green-700');
  });

  it('submit button is disabled when no token is present in the URL', async () => {
    renderActivate();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Activar cuenta' })).toBeDisabled();
  });

  it('submit button is enabled when a token is present in the URL', async () => {
    renderActivate('abc-token');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Activar cuenta' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Activar cuenta' })).not.toBeDisabled();
  });

  it('shows expired-token error message on 400 response', async () => {
    server.use(http.post('*/auth/activate', () => new HttpResponse(null, { status: 400 })));

    const user = userEvent.setup();
    renderActivate('expired-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'El enlace de activación ha expirado. Solicita uno nuevo al administrador.'
        )
      ).toBeInTheDocument();
    });
  });

  it('shows invalid-token error message on 404 response', async () => {
    server.use(http.post('*/auth/activate', () => new HttpResponse(null, { status: 404 })));

    const user = userEvent.setup();
    renderActivate('invalid-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('El enlace de activación no es válido.')).toBeInTheDocument();
    });
  });

  it('shows generic error message on unexpected API error', async () => {
    server.use(http.post('*/auth/activate', () => new HttpResponse(null, { status: 500 })));

    const user = userEvent.setup();
    renderActivate('some-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Error inesperado. Inténtalo de nuevo.')).toBeInTheDocument();
    });
  });

  it('redirects to /login after successful activation', async () => {
    server.use(http.post('*/auth/activate', () => new HttpResponse(null, { status: 204 })));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob([new Uint8Array([1, 2, 3])]))
    );

    const user = userEvent.setup();
    const { router } = renderActivate('valid-token');

    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Contraseña'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Elige tu avatar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Omitir' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });
});
