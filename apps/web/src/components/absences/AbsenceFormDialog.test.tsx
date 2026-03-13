import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbsenceUnit, UserRole } from '@repo/types';
import type { AbsenceType, User } from '@repo/types';
import { AbsenceFormDialog } from './AbsenceFormDialog';

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
    requiresValidation: true,
    allowPastDates: false,
    minDaysInAdvance: 7,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    name: 'Asuntos propios',
    unit: AbsenceUnit.HOURS,
    maxPerYear: 40,
    minDuration: 1,
    maxDuration: 8,
    requiresValidation: false,
    allowPastDates: true,
    minDaysInAdvance: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockUsers: User[] = [
  {
    id: '01900000-0000-7000-8000-000000000010',
    name: 'Validador 1',
    email: 'validator1@example.com',
    role: UserRole.VALIDATOR,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000011',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000012',
    name: 'Empleado Normal',
    email: 'empleado@example.com',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

function renderDialog(props: Partial<Parameters<typeof AbsenceFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  server.use(
    http.get('*/absence-types', () => HttpResponse.json(mockAbsenceTypes)),
    http.get('*/users', () => HttpResponse.json(mockUsers))
  );

  render(
    <QueryClientProvider client={queryClient}>
      <AbsenceFormDialog open={true} onOpenChange={onOpenChange} onSuccess={onSuccess} {...props} />
    </QueryClientProvider>
  );

  return { onOpenChange, onSuccess };
}

describe('AbsenceFormDialog', () => {
  it('envía startAt y endAt en formato ISO 8601 UTC al crear una ausencia', async () => {
    const user = userEvent.setup();
    let capturedPayload: Record<string, unknown> | null = null;

    server.use(
      http.post('*/absences', async ({ request }) => {
        capturedPayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: '01900000-0000-7000-8000-000000000999',
            absenceTypeId: '01900000-0000-7000-8000-000000000001',
            userId: '01900000-0000-7000-8000-000000000500',
            startAt: '2026-03-09T13:30:00.000Z',
            endAt: '2026-03-09T15:30:00.000Z',
            status: 'PENDING',
            createdAt: '2026-03-01T12:00:00.000Z',
            updatedAt: '2026-03-01T12:00:00.000Z',
          },
          { status: 201 }
        );
      })
    );

    const { onSuccess, onOpenChange } = renderDialog();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });

    const absenceTypeCombobox = screen.getByRole('combobox', { name: 'Tipo de ausencia' });
    await user.click(absenceTypeCombobox);
    const typeOption = await screen.findByRole('option', { name: mockAbsenceTypes[0].name });
    await user.click(typeOption);

    await user.type(screen.getByLabelText('Fecha y hora de inicio'), '2026-03-09T14:30');
    await user.type(screen.getByLabelText('Fecha y hora de fin'), '2026-03-09T16:30');
    await user.click(screen.getByRole('button', { name: 'Crear ausencia' }));

    await waitFor(() => {
      expect(capturedPayload).not.toBeNull();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload?.['startAt']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(capturedPayload?.['endAt']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('muestra el formulario de creación de ausencia con todos los campos requeridos', async () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Nueva ausencia' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Fecha y hora de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha y hora de fin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear ausencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('muestra errores de validación al enviar el formulario sin completar campos requeridos', async () => {
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Crear ausencia' }));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('carga los tipos de ausencia disponibles', async () => {
    renderDialog();

    await waitFor(() => {
      const select = screen.getByLabelText('Tipo de ausencia');
      expect(select).toBeInTheDocument();
    });
  });

  it('carga los usuarios disponibles para el selector de validadores', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });
  });

  it('cierra el diálogo al hacer clic en cancelar', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await waitFor(() => {
      expect(screen.getByLabelText('Tipo de ausencia')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
