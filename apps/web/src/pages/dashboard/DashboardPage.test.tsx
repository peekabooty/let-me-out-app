import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';

import { AbsenceStatus, UserRole } from '@repo/types';
import type { DashboardData } from '../../lib/api-client';
import { DashboardPage } from './DashboardPage';
import { useAuthStore } from '../../store/auth.store';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockDashboardData: DashboardData = {
  balances: [
    {
      absenceTypeId: '01900000-0000-7000-8000-000000000001',
      absenceTypeName: 'Vacaciones',
      unit: 'days',
      maxPerYear: 22,
      consumed: 10,
      remaining: 12,
    },
    {
      absenceTypeId: '01900000-0000-7000-8000-000000000002',
      absenceTypeName: 'Ausencia no retribuida planeada',
      unit: 'hours',
      maxPerYear: 80,
      consumed: 24,
      remaining: 56,
    },
  ],
  upcomingAbsences: [
    {
      id: '01900000-0000-7000-8000-000000000010',
      absenceTypeName: 'Vacaciones',
      startAt: '2026-04-15T00:00:00.000Z',
      endAt: '2026-04-20T00:00:00.000Z',
      duration: 5,
      status: AbsenceStatus.ACCEPTED,
    },
    {
      id: '01900000-0000-7000-8000-000000000011',
      absenceTypeName: 'Ausencia no retribuida planeada',
      startAt: '2026-05-10T08:00:00.000Z',
      endAt: '2026-05-10T12:00:00.000Z',
      duration: 4,
      status: null,
    },
  ],
  pendingValidations: [
    {
      id: '01900000-0000-7000-8000-000000000020',
      userName: 'John Doe',
      absenceTypeName: 'Vacaciones',
      startAt: '2026-06-01T00:00:00.000Z',
      endAt: '2026-06-05T00:00:00.000Z',
      duration: 4,
      createdAt: '2026-03-01T10:00:00.000Z',
    },
  ],
};

function renderComponent(userRole: UserRole = UserRole.STANDARD) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Set up auth store with user
  useAuthStore.setState({
    user: {
      id: '01900000-0000-7000-8000-000000000100',
      email: 'test@example.com',
      name: 'Test User',
      role: userRole,
      isActive: true,
    },
    isLoading: false,
  });

  const rootRoute = createRootRoute();
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: DashboardPage,
  });

  const absenceDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/absences/$absenceId',
    component: () => <div>Absence Detail Page</div>,
  });

  const routeTree = rootRoute.addChildren([dashboardRoute, absenceDetailRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('shows loading state initially', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get('*/dashboard', async () => {
        await requestPromise;
        return HttpResponse.json(mockDashboardData);
      })
    );

    renderComponent();

    expect(screen.getByText(/cargando datos/i)).toBeInTheDocument();

    resolveRequest?.(null);

    await waitFor(() => {
      expect(screen.queryByText(/cargando datos/i)).not.toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.error()));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar los datos/i)).toBeInTheDocument();
    });
  });

  it('renders balance cards for each absence type', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Balance de ausencias')).toBeInTheDocument();
    });

    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Ausencia no retribuida planeada')).toBeInTheDocument();
    expect(screen.getByText('22 días')).toBeInTheDocument();
    expect(screen.getByText('80 horas')).toBeInTheDocument();
  });

  it('shows correct consumed and remaining values', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Balance de ausencias')).toBeInTheDocument();
    });

    // Check consumed values
    expect(screen.getByText('10 días')).toBeInTheDocument();
    expect(screen.getByText('24 horas')).toBeInTheDocument();

    // Check remaining values
    expect(screen.getByText('12 días')).toBeInTheDocument();
    expect(screen.getByText('56 horas')).toBeInTheDocument();
  });

  it('renders upcoming absences list', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Próximas ausencias')).toBeInTheDocument();
    });

    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Ausencia no retribuida planeada')).toBeInTheDocument();
  });

  it('shows empty state when no upcoming absences', async () => {
    const emptyData: DashboardData = {
      ...mockDashboardData,
      upcomingAbsences: [],
    };

    server.use(http.get('*/dashboard', () => HttpResponse.json(emptyData)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/no tienes ausencias próximas/i)).toBeInTheDocument();
    });
  });

  it('navigates to absence detail when clicking on upcoming absence', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Próximas ausencias')).toBeInTheDocument();
    });

    const absenceItems = screen.getAllByRole('button');
    const firstUpcomingAbsence = absenceItems.find((item) =>
      item.textContent?.includes('Vacaciones')
    );

    if (firstUpcomingAbsence) {
      await user.click(firstUpcomingAbsence);

      await waitFor(() => {
        expect(screen.getByText('Absence Detail Page')).toBeInTheDocument();
      });
    }
  });

  it('shows pending validations for validators', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    renderComponent(UserRole.VALIDATOR);

    await waitFor(() => {
      expect(screen.getByText('Validaciones pendientes')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('hides pending validations for standard users', async () => {
    server.use(http.get('*/dashboard', () => HttpResponse.json(mockDashboardData)));

    renderComponent(UserRole.STANDARD);

    await waitFor(() => {
      expect(screen.getByText('Balance de ausencias')).toBeInTheDocument();
    });

    expect(screen.queryByText('Validaciones pendientes')).not.toBeInTheDocument();
  });

  it('shows empty state when no pending validations for validator', async () => {
    const dataWithoutValidations: DashboardData = {
      ...mockDashboardData,
      pendingValidations: [],
    };

    server.use(http.get('*/dashboard', () => HttpResponse.json(dataWithoutValidations)));

    renderComponent(UserRole.VALIDATOR);

    await waitFor(() => {
      expect(screen.getByText('Balance de ausencias')).toBeInTheDocument();
    });

    // Should not show pending validations section when empty
    expect(screen.queryByText('Validaciones pendientes')).not.toBeInTheDocument();
  });

  it('shows empty state message when no absence types configured', async () => {
    const emptyBalances: DashboardData = {
      ...mockDashboardData,
      balances: [],
    };

    server.use(http.get('*/dashboard', () => HttpResponse.json(emptyBalances)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/no hay tipos de ausencia configurados/i)).toBeInTheDocument();
    });
  });
});
