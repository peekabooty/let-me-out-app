import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AbsenceUnit } from '@repo/types';
import type { AbsenceType } from '@repo/types';
import { AbsenceNewPage } from './AbsenceNewPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAbsenceTypes: AbsenceType[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    name: 'Vacaciones',
    unit: AbsenceUnit.DAYS,
    maxPerYear: 22,
    minDuration: 1,
    maxDuration: 15,
    requiresValidation: false,
    allowPastDates: false,
    minDaysInAdvance: 7,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  server.use(
    http.get('*/absence-types', () => HttpResponse.json(mockAbsenceTypes)),
    http.get('*/users', () => HttpResponse.json([]))
  );

  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Dashboard</div>,
  });
  const absenceNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/absences/new',
    component: AbsenceNewPage,
  });

  const routeTree = rootRoute.addChildren([indexRoute, absenceNewRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/absences/new'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('AbsenceNewPage', () => {
  it('muestra el formulario de nueva ausencia', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva ausencia' })).toBeInTheDocument();
    });
  });

  it('muestra el campo de tipo de ausencia', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });
  });

  it('muestra el botón de crear ausencia', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Crear ausencia' })).toBeInTheDocument();
    });
  });

  it('navega al dashboard al cancelar', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
