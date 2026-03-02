import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbsenceStatus, UserRole } from '@repo/types';
import type { Absence } from '@repo/types';
import { useAuthStore } from '../../store/auth.store';
import { AbsenceCancelActions } from './AbsenceCancelActions';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 10);

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);

const mockAbsence: Absence = {
  id: '01900000-0000-7000-8000-000000000001',
  userId: '01900000-0000-7000-8000-000000000010',
  absenceTypeId: '01900000-0000-7000-8000-000000000020',
  startAt: futureDate.toISOString(),
  endAt: new Date(futureDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  duration: 5,
  status: AbsenceStatus.ACCEPTED,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

function renderComponent(absence: Absence = mockAbsence, onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AbsenceCancelActions absence={absence} onSuccess={onSuccess} />
    </QueryClientProvider>
  );

  return { onSuccess, container: result.container };
}

describe('AbsenceCancelActions', () => {
  it('muestra botón de cancelar para el creador de la ausencia en estado ACCEPTED antes del inicio', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByRole('button', { name: 'Cancelar ausencia' })).toBeInTheDocument();
  });

  it('no muestra botón si el usuario no es el creador de la ausencia', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000099',
        name: 'Otro Empleado',
        email: 'otro@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra botón si la ausencia no está en estado ACCEPTED', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    const absenceWaiting = { ...mockAbsence, status: AbsenceStatus.WAITING_VALIDATION };

    const { container } = renderComponent(absenceWaiting);

    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra botón si la ausencia ya ha comenzado (RF-51)', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    const absenceStarted = {
      ...mockAbsence,
      startAt: pastDate.toISOString(),
    };

    const { container } = renderComponent(absenceStarted);

    expect(container).toBeEmptyDOMElement();
  });

  it('llama a la API de cancelar al hacer clic en el botón', async () => {
    const user = userEvent.setup();
    let apiCalled = false;

    server.use(
      http.post('*/absences/:id/cancel', () => {
        apiCalled = true;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    const { onSuccess } = renderComponent();

    await user.click(screen.getByRole('button', { name: 'Cancelar ausencia' }));

    await waitFor(() => {
      expect(apiCalled).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('muestra un mensaje de error cuando cancelar falla', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/cancel', () =>
        HttpResponse.json({ message: 'Error al cancelar' }, { status: 500 })
      )
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Cancelar ausencia' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error al cancelar');
    });
  });

  it('deshabilita el botón mientras se procesa la cancelación', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/cancel', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(null, { status: 200 });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    const cancelButton = screen.getByRole('button', { name: 'Cancelar ausencia' });

    await user.click(cancelButton);

    expect(cancelButton).toBeDisabled();
    expect(screen.getByText('Procesando…')).toBeInTheDocument();
  });

  it('muestra mensaje de error genérico cuando el servidor no devuelve mensaje específico', async () => {
    const user = userEvent.setup();

    server.use(http.post('*/absences/:id/cancel', () => HttpResponse.json({}, { status: 500 })));

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Cancelar ausencia' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error al cancelar la ausencia. Inténtalo de nuevo.');
    });
  });
});
