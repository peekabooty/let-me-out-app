import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole, type SessionUser } from '../../store/auth.store';
import { AppSidebar } from './AppSidebar';

const logoutMock = vi.hoisted(() => vi.fn<[], Promise<void>>());

vi.mock('../../lib/api-client', () => ({
  logout: logoutMock,
}));

const storageKey = 'sidebar-collapsed';

function buildTestRouter(user: SessionUser) {
  const rootRoute = createRootRoute({
    component: () => <AppSidebar user={user} />,
  });

  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });

  const routeTree = rootRoute.addChildren([indexRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
}

function renderSidebar(userRole: UserRole = UserRole.STANDARD) {
  const user: SessionUser = {
    id: '01900000-0000-7000-8000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role: userRole,
    isActive: true,
  };

  const router = buildTestRouter(user);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

afterEach(() => {
  logoutMock.mockReset();
});

describe('AppSidebar', () => {
  it('renders expanded by default with icon and text labels', async () => {
    renderSidebar(UserRole.STANDARD);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colapsar barra lateral' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('renders collapsed from localStorage with title and aria-label links', async () => {
    globalThis.localStorage.setItem(storageKey, 'true');

    renderSidebar(UserRole.STANDARD);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Calendario')).not.toBeInTheDocument();
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('title', 'Dashboard');
    const calendarLink = screen.getByRole('link', { name: 'Calendario' });
    expect(calendarLink).toHaveAttribute('title', 'Calendario');

    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('persists collapsed state changes in localStorage', async () => {
    const user = userEvent.setup();

    renderSidebar(UserRole.STANDARD);

    const toggleButton = await screen.findByRole('button', { name: 'Colapsar barra lateral' });
    await user.click(toggleButton);

    expect(globalThis.localStorage.getItem(storageKey)).toBe('true');

    const expandButton = await screen.findByRole('button', { name: 'Expandir barra lateral' });
    await user.click(expandButton);

    expect(globalThis.localStorage.getItem(storageKey)).toBe('false');
  });

  it('does not render Solicitar ausencia for standard users', async () => {
    renderSidebar(UserRole.STANDARD);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: 'Solicitar ausencia' })).not.toBeInTheDocument();
  });

  it('shows theme button and opens theme dialog', async () => {
    const user = userEvent.setup();
    renderSidebar(UserRole.STANDARD);

    const themeButton = await screen.findByRole('button', { name: 'Tema' });
    await user.click(themeButton);

    expect(await screen.findByRole('heading', { name: 'Seleccionar tema' })).toBeInTheDocument();
  });
});
