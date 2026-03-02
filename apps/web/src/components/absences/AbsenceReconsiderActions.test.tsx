import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbsenceStatus, UserRole } from '@repo/types';
import type { Absence } from '@repo/types';
import { useAuthStore } from '../../store/auth.store';
import { AbsenceReconsiderActions } from './AbsenceReconsiderActions';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockAbsence: Absence = {
  id: '01900000-0000-7000-8000-000000000001',
  userId: '01900000-0000-7000-8000-000000000010',
  absenceTypeId: '01900000-0000-7000-8000-000000000020',
  startAt: '2026-03-10T09:00:00.000Z',
  endAt: '2026-03-15T18:00:00.000Z',
  duration: 5,
  status: AbsenceStatus.RECONSIDER,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

function renderComponent(absence: Absence = mockAbsence, onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AbsenceReconsiderActions absence={absence} onSuccess={onSuccess} />
    </QueryClientProvider>
  );

  return { onSuccess, container: result.container };
}

describe('AbsenceReconsiderActions', () => {
  it('muestra botones de reenviar y descartar para el creador de la ausencia en estado RECONSIDER', () => {
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

    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
  });

  it('no muestra botones si el usuario no es el creador de la ausencia', () => {
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

  it('no muestra botones si la ausencia no está en estado RECONSIDER', () => {
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

  it('llama a la API de reconsiderar al hacer clic en reenviar', async () => {
    const user = userEvent.setup();
    let apiCalled = false;

    server.use(
      http.post('*/absences/:id/reconsider', () => {
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

    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      expect(apiCalled).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('llama a la API de descartar al hacer clic en descartar', async () => {
    const user = userEvent.setup();
    let apiCalled = false;

    server.use(
      http.post('*/absences/:id/discard', () => {
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

    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    await waitFor(() => {
      expect(apiCalled).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('muestra un mensaje de error cuando reenviar falla', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/reconsider', () =>
        HttpResponse.json({ message: 'Error al reenviar' }, { status: 500 })
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

    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error al reenviar');
    });
  });

  it('muestra un mensaje de error cuando descartar falla', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/discard', () =>
        HttpResponse.json({ message: 'Error al descartar' }, { status: 500 })
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

    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error al descartar');
    });
  });

  it('deshabilita ambos botones mientras se procesa reenviar', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/reconsider', async () => {
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

    const reenviarButton = screen.getByRole('button', { name: 'Reenviar' });
    const descartarButton = screen.getByRole('button', { name: 'Descartar' });

    await user.click(reenviarButton);

    expect(reenviarButton).toBeDisabled();
    expect(descartarButton).toBeDisabled();
    expect(screen.getByText('Procesando…')).toBeInTheDocument();
  });

  it('deshabilita ambos botones mientras se procesa descartar', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/discard', async () => {
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

    const reenviarButton = screen.getByRole('button', { name: 'Reenviar' });
    const descartarButton = screen.getByRole('button', { name: 'Descartar' });

    await user.click(descartarButton);

    expect(reenviarButton).toBeDisabled();
    expect(descartarButton).toBeDisabled();
    expect(screen.getByText('Procesando…')).toBeInTheDocument();
  });
});
