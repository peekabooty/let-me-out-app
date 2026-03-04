import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';

import { AbsenceStatus } from '@repo/types';
import type { CalendarAbsence } from '../../lib/api-client';
import { CalendarView } from './CalendarView';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockCalendarAbsences: CalendarAbsence[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    userId: '01900000-0000-7000-8000-000000000010',
    userName: 'John Doe',
    absenceTypeId: '01900000-0000-7000-8000-000000000030',
    absenceTypeName: 'Vacation',
    startAt: '2026-03-10T00:00:00.000Z',
    endAt: '2026-03-15T00:00:00.000Z',
    duration: 5,
    status: AbsenceStatus.ACCEPTED,
    isOwn: true,
    teamColor: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    userId: '01900000-0000-7000-8000-000000000011',
    userName: 'Jane Smith',
    absenceTypeId: '01900000-0000-7000-8000-000000000031',
    absenceTypeName: 'Medical Leave',
    startAt: '2026-03-20T00:00:00.000Z',
    endAt: '2026-03-22T00:00:00.000Z',
    duration: 2,
    status: AbsenceStatus.ACCEPTED,
    isOwn: false,
    teamColor: '#f59e0b',
    createdAt: '2026-03-01T11:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000003',
    userId: '01900000-0000-7000-8000-000000000012',
    userName: 'Bob Johnson',
    absenceTypeId: '01900000-0000-7000-8000-000000000030',
    absenceTypeName: 'Vacation',
    startAt: '2026-03-25T00:00:00.000Z',
    endAt: '2026-03-27T00:00:00.000Z',
    duration: 2,
    status: AbsenceStatus.WAITING_VALIDATION,
    isOwn: false,
    teamColor: '#10b981',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
  },
];

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: CalendarView,
  });

  const absenceDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/absences/$absenceId',
    component: () => <div>Absence Detail Page</div>,
  });

  const routeTree = rootRoute.addChildren([indexRoute, absenceDetailRoute]);
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

describe('CalendarView', () => {
  it('shows loading state initially', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get('*/absences/calendar', async () => {
        await requestPromise;
        return HttpResponse.json([]);
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
    });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    // Resolve the request to cleanup
    resolveRequest?.(null);
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('*/absences/calendar', () => {
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Error loading calendar/i)).toBeInTheDocument();
    });
  });

  it('renders calendar with absences', async () => {
    server.use(http.get('*/absences/calendar', () => HttpResponse.json(mockCalendarAbsences)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/John Doe - Vacation/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith - Medical Leave/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob Johnson - Vacation/i)).toBeInTheDocument();
    });
  });

  it('renders empty calendar when no absences', async () => {
    server.use(http.get('*/absences/calendar', () => HttpResponse.json([])));

    renderComponent();

    await waitFor(() => {
      // FullCalendar should render but with no events
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
    });
  });

  it('navigates to absence detail when event is clicked', async () => {
    server.use(http.get('*/absences/calendar', () => HttpResponse.json(mockCalendarAbsences)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/John Doe - Vacation/i)).toBeInTheDocument();
    });

    // Click on the event
    const event = screen.getByText(/John Doe - Vacation/i);
    await userEvent.click(event);

    // The router should navigate to the absence detail page
    await waitFor(() => {
      expect(screen.getByText('Absence Detail Page')).toBeInTheDocument();
    });
  });

  it('applies color differentiation for own vs team absences', async () => {
    server.use(http.get('*/absences/calendar', () => HttpResponse.json(mockCalendarAbsences)));

    renderComponent();

    await waitFor(() => {
      const ownAbsence = screen.getByText(/John Doe - Vacation/i).closest('.fc-event');
      const teamAbsence = screen.getByText(/Jane Smith - Medical Leave/i).closest('.fc-event');

      expect(ownAbsence).toBeInTheDocument();
      expect(teamAbsence).toBeInTheDocument();
      expect(ownAbsence).toHaveStyle({ backgroundColor: 'rgb(37, 99, 235)' });
      expect(teamAbsence).toHaveStyle({ backgroundColor: 'rgb(245, 158, 11)' });
    });
  });

  it('displays calendar navigation controls', async () => {
    server.use(http.get('*/absences/calendar', () => HttpResponse.json([])));

    renderComponent();

    await waitFor(() => {
      // FullCalendar uses specific button classes instead of text labels for prev/next
      expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
      expect(screen.getByText('today')).toBeInTheDocument();
    });
  });
});
