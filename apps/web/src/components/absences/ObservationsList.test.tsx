import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Observation } from '@repo/types';
import { UserRole } from '@repo/types';
import { useAuthStore } from '../../store/auth.store';
import { ObservationsList } from './ObservationsList';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockObservations: Observation[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    absenceId: '01900000-0000-7000-8000-000000000100',
    userId: '01900000-0000-7000-8000-000000000010',
    content: 'Primera observación',
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    absenceId: '01900000-0000-7000-8000-000000000100',
    userId: '01900000-0000-7000-8000-000000000011',
    content: 'Segunda observación\nCon múltiples líneas',
    createdAt: '2026-03-02T11:30:00.000Z',
  },
];

function renderComponent(absenceId = '01900000-0000-7000-8000-000000000100') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ObservationsList absenceId={absenceId} />
    </QueryClientProvider>
  );
}

describe('ObservationsList', () => {
  it('muestra estado de carga inicialmente', () => {
    server.use(
      http.get('*/absences/:absenceId/observations', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json([]);
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByText('Cargando observaciones…')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay observaciones', async () => {
    server.use(http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])));

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No hay observaciones todavía.')).toBeInTheDocument();
    });
  });

  it('muestra lista de observaciones existentes', async () => {
    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json(mockObservations))
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Primera observación')).toBeInTheDocument();
      expect(screen.getByText(/Segunda observación/)).toBeInTheDocument();
    });
  });

  it('marca observaciones propias con "Tú"', async () => {
    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json(mockObservations))
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Tú')).toBeInTheDocument();
    });
  });

  it('renderiza contenido con white-space pre-wrap', async () => {
    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json(mockObservations))
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      const observationText = screen.getByText(/Segunda observación/);
      expect(observationText).toHaveClass('whitespace-pre-wrap');
    });
  });

  it('permite crear una nueva observación', async () => {
    const user = userEvent.setup();
    let capturedContent: string | null = null;

    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])),
      http.post('*/absences/:absenceId/observations', async ({ request }) => {
        const body = (await request.json()) as { content: string };
        capturedContent = body.content;
        return HttpResponse.json({ id: '01900000-0000-7000-8000-000000000003' });
      })
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una observación…')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Escribe una observación…');
    const submitButton = screen.getByRole('button', { name: 'Añadir observación' });

    await user.type(textarea, 'Nueva observación de prueba');
    await user.click(submitButton);

    await waitFor(() => {
      expect(capturedContent).toBe('Nueva observación de prueba');
    });
  });

  it('limpia el formulario después de crear una observación', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])),
      http.post('*/absences/:absenceId/observations', () =>
        HttpResponse.json({ id: '01900000-0000-7000-8000-000000000003' })
      )
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una observación…')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Escribe una observación…') as HTMLTextAreaElement;
    const submitButton = screen.getByRole('button', { name: 'Añadir observación' });

    await user.type(textarea, 'Test');
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('no permite enviar observaciones vacías', async () => {
    server.use(http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])));

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Añadir observación' });
      expect(submitButton).toBeDisabled();
    });
  });

  it('muestra botón de cancelar cuando hay texto', async () => {
    const user = userEvent.setup();

    server.use(http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])));

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una observación…')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Escribe una observación…');

    await user.type(textarea, 'Test');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });
  });

  it('limpia el texto al hacer clic en cancelar', async () => {
    const user = userEvent.setup();

    server.use(http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])));

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una observación…')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Escribe una observación…') as HTMLTextAreaElement;

    await user.type(textarea, 'Test');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(textarea.value).toBe('');
  });

  it('muestra mensaje de error cuando falla la creación', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('*/absences/:absenceId/observations', () => HttpResponse.json([])),
      http.post('*/absences/:absenceId/observations', () =>
        HttpResponse.json({ message: 'Error al crear observación' }, { status: 500 })
      )
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una observación…')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Escribe una observación…');
    const submitButton = screen.getByRole('button', { name: 'Añadir observación' });

    await user.type(textarea, 'Test');
    await user.click(submitButton);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Error al crear observación');
    });
  });

  it('muestra error genérico si falla la carga de observaciones', async () => {
    server.use(
      http.get('*/absences/:absenceId/observations', () =>
        HttpResponse.json({ message: 'Error de servidor' }, { status: 500 })
      )
    );

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000010',
        name: 'Usuario',
        email: 'user@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Error al cargar las observaciones');
    });
  });
});
