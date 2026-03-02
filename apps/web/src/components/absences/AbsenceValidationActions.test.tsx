import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbsenceStatus, UserRole, ValidationDecision } from '@repo/types';
import type { Absence } from '@repo/types';
import { useAuthStore } from '../../store/auth.store';
import { AbsenceValidationActions } from './AbsenceValidationActions';

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
  status: AbsenceStatus.WAITING_VALIDATION,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

function renderComponent(
  absence: Absence = mockAbsence,
  validatorIds: string[] = ['01900000-0000-7000-8000-000000000011'],
  onSuccess = vi.fn()
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AbsenceValidationActions
        absence={absence}
        validatorIds={validatorIds}
        onSuccess={onSuccess}
      />
    </QueryClientProvider>
  );

  return { onSuccess, container: result.container };
}

describe('AbsenceValidationActions', () => {
  it('muestra botones de aceptar y rechazar para un validador asignado', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('no muestra botones si el usuario no es validador', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000012',
        name: 'Empleado',
        email: 'empleado@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra botones si el usuario no está asignado como validador de esta ausencia', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000099',
        name: 'Otro Validador',
        email: 'otro@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra botones si la ausencia no está en estado WAITING_VALIDATION', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    const absenceAccepted = { ...mockAbsence, status: AbsenceStatus.ACCEPTED };

    const { container } = renderComponent(absenceAccepted);

    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra botones si el validador es el creador de la ausencia (RF-34)', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Validador Creador',
        email: 'validator-creator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    const { container } = renderComponent(mockAbsence, ['01900000-0000-7000-8000-000000000010']);

    expect(container).toBeEmptyDOMElement();
  });

  it('permite a un admin validar ausencias si está asignado', () => {
    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('llama a la API con la decisión ACCEPTED al hacer clic en aceptar', async () => {
    const user = userEvent.setup();
    let capturedDecision: ValidationDecision | null = null;

    server.use(
      http.post('*/absences/:id/validate', async ({ request }) => {
        const body = (await request.json()) as { decision: ValidationDecision };
        capturedDecision = body.decision;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    const { onSuccess } = renderComponent();

    await user.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => {
      expect(capturedDecision).toBe(ValidationDecision.ACCEPTED);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('llama a la API con la decisión REJECTED al hacer clic en rechazar', async () => {
    const user = userEvent.setup();
    let capturedDecision: ValidationDecision | null = null;

    server.use(
      http.post('*/absences/:id/validate', async ({ request }) => {
        const body = (await request.json()) as { decision: ValidationDecision };
        capturedDecision = body.decision;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    const { onSuccess } = renderComponent();

    await user.click(screen.getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => {
      expect(capturedDecision).toBe(ValidationDecision.REJECTED);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('muestra un mensaje de error cuando la validación falla', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/validate', () =>
        HttpResponse.json({ message: 'Error de servidor' }, { status: 500 })
      )
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error de servidor');
    });
  });

  it('deshabilita los botones mientras se procesa la validación', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/absences/:id/validate', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(null, { status: 200 });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000011',
        name: 'Validador',
        email: 'validator@example.com',
        role: UserRole.VALIDATOR,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    const acceptButton = screen.getByRole('button', { name: 'Aceptar' });
    const rejectButton = screen.getByRole('button', { name: 'Rechazar' });

    await user.click(acceptButton);

    expect(acceptButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Procesando…' }).length).toBe(2);
  });
});
