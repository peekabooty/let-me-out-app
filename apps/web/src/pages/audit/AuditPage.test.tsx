import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AbsenceStatus } from '@repo/types';
import type { Team } from '@repo/types';
import type { AuditAbsence } from '../../lib/api-client';

import { AuditPage } from './AuditPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockTeams: Team[] = [
  {
    id: '01930000-0000-7000-8000-000000000001',
    name: 'Equipo Alpha',
    color: '#FF5733',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000002',
    name: 'Equipo Beta',
    color: '#3357FF',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockAbsences: AuditAbsence[] = [
  {
    id: '01930000-0000-7000-8000-000000000011',
    userId: '01930000-0000-7000-8000-000000000101',
    userName: 'Ana García',
    absenceTypeId: '01930000-0000-7000-8000-000000000201',
    absenceTypeName: 'Vacaciones',
    startAt: '2024-07-01T00:00:00.000Z',
    endAt: '2024-07-05T00:00:00.000Z',
    duration: 5,
    status: AbsenceStatus.ACCEPTED,
    teamId: '01930000-0000-7000-8000-000000000001',
    teamName: 'Equipo Alpha',
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000012',
    userId: '01930000-0000-7000-8000-000000000102',
    userName: 'Luis Pérez',
    absenceTypeId: '01930000-0000-7000-8000-000000000202',
    absenceTypeName: 'Baja médica',
    startAt: '2024-08-10T00:00:00.000Z',
    endAt: '2024-08-12T00:00:00.000Z',
    duration: 3,
    status: AbsenceStatus.WAITING_VALIDATION,
    teamId: '01930000-0000-7000-8000-000000000002',
    teamName: 'Equipo Beta',
    createdAt: '2024-08-05T14:30:00.000Z',
    updatedAt: '2024-08-05T14:30:00.000Z',
  },
];

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuditPage />
    </QueryClientProvider>
  );
}

describe('AuditPage', () => {
  it('renders page title and description', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    renderComponent();

    expect(screen.getByText('Auditoría de Ausencias')).toBeInTheDocument();
    expect(
      screen.getByText('Vista de solo lectura de todas las ausencias del sistema.')
    ).toBeInTheDocument();
  });

  it('renders CSV export button', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar CSV/i })).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    server.use(
      http.get('*/teams', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockTeams);
      }),
      http.get('*/audit/absences', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json([]);
      })
    );

    renderComponent();

    expect(screen.getByText('Cargando ausencias…')).toBeInTheDocument();
  });

  it('shows absences table when data is loaded', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    });
  });

  it('shows error message when absences fail to load', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json({ error: 'Error' }, { status: 500 }))
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo cargar la lista de ausencias. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('shows error message when teams fail to load', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json({ error: 'Error' }, { status: 500 })),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo cargar la lista de equipos. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('renders filters when teams are loaded', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
      expect(screen.getByLabelText('Estado')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha inicio')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha fin')).toBeInTheDocument();
    });
  });

  it('opens export URL in new tab when export button is clicked', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json(mockAbsences))
    );

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar CSV/i })).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Exportar CSV/i });
    await user.click(exportButton);

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/audit/export'), '_blank');

    openSpy.mockRestore();
  });

  it('shows empty state when no absences match filters', async () => {
    server.use(
      http.get('*/teams', () => HttpResponse.json(mockTeams)),
      http.get('*/audit/absences', () => HttpResponse.json([]))
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('No se encontraron ausencias con los filtros seleccionados.')
      ).toBeInTheDocument();
    });
  });
});
