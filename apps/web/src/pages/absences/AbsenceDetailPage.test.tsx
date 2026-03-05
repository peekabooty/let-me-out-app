import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AbsenceStatus, UserRole } from '@repo/types';
import { useAuthStore } from '../../store/auth.store';
import { AbsenceDetailPage } from './AbsenceDetailPage';

const ABSENCE_ID = '01900000-0000-7000-8000-000000000001';
const OWNER_ID = '01900000-0000-7000-8000-000000000010';
const VALIDATOR_ID = '01900000-0000-7000-8000-000000000011';

const mockAbsenceDetail = {
  id: ABSENCE_ID,
  userId: OWNER_ID,
  absenceTypeId: '01900000-0000-7000-8000-000000000020',
  startAt: '2026-04-10T09:00:00.000Z',
  endAt: '2026-04-15T18:00:00.000Z',
  duration: 5,
  status: AbsenceStatus.WAITING_VALIDATION,
  validatorIds: [VALIDATOR_ID],
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

const server = setupServer(
  http.get(`*/absences/${ABSENCE_ID}`, () => HttpResponse.json(mockAbsenceDetail)),
  http.get(`*/absences/${ABSENCE_ID}/observations`, () => HttpResponse.json([]))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/absences/$absenceId',
    component: AbsenceDetailPage,
  });

  const routeTree = rootRoute.addChildren([detailRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/absences/${ABSENCE_ID}`] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('AbsenceDetailPage — carga de datos', () => {
  it('muestra el encabezado de detalle', async () => {
    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de ausencia' })).toBeInTheDocument();
    });
  });

  it('muestra el estado de la ausencia', async () => {
    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pendiente de validación')).toBeInTheDocument();
    });
  });

  it('muestra el encabezado de detalle cuando los datos cargan', async () => {
    server.use(
      http.get(`*/absences/${ABSENCE_ID}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json(mockAbsenceDetail);
      })
    );

    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de ausencia' })).toBeInTheDocument();
    });
  });

  it('muestra un error cuando no se puede cargar la ausencia', async () => {
    server.use(
      http.get(`*/absences/${ABSENCE_ID}`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    );

    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo cargar la ausencia. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });
});

describe('AbsenceDetailPage — visibilidad de acciones por rol y estado', () => {
  it('muestra botones de validación para un validador asignado cuando estado es WAITING_VALIDATION', async () => {
    useAuthStore.setState({
      user: {
        id: VALIDATOR_ID,
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    });
  });

  it('no muestra botones de validación para el propietario de la ausencia', async () => {
    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de ausencia' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  it('muestra botones de replantear para el propietario cuando estado es RECONSIDER', async () => {
    server.use(
      http.get(`*/absences/${ABSENCE_ID}`, () =>
        HttpResponse.json({ ...mockAbsenceDetail, status: AbsenceStatus.RECONSIDER })
      )
    );

    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reenviar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
    });
  });

  it('muestra botón de cancelar para el propietario cuando estado es ACCEPTED y la ausencia no ha comenzado', async () => {
    const futureStart = new Date();
    futureStart.setFullYear(futureStart.getFullYear() + 1);
    const futureEnd = new Date(futureStart);
    futureEnd.setDate(futureEnd.getDate() + 5);

    server.use(
      http.get(`*/absences/${ABSENCE_ID}`, () =>
        HttpResponse.json({
          ...mockAbsenceDetail,
          status: AbsenceStatus.ACCEPTED,
          startAt: futureStart.toISOString(),
          endAt: futureEnd.toISOString(),
        })
      )
    );

    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar ausencia' })).toBeInTheDocument();
    });
  });

  it('no muestra la tarjeta de acciones para un auditor', async () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000099',
        name: 'Auditor',
        email: 'auditor@example.com',
        role: UserRole.AUDITOR,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de ausencia' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: 'Acciones' })).not.toBeInTheDocument();
  });

  it('muestra la sección de observaciones', async () => {
    useAuthStore.setState({
      user: {
        id: OWNER_ID,
        name: 'Empleado',
        email: 'emp@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Observaciones')).toBeInTheDocument();
    });
  });
});
