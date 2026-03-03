import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Notification } from '@repo/types';
import { NotificationsList } from './NotificationsList';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockNotifications: Notification[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    userId: '01900000-0000-7000-8000-000000000010',
    absenceId: '01900000-0000-7000-8000-000000000020',
    type: 'validator_assignment',
    message: 'Nueva ausencia de Juan Pérez asignada para validación',
    read: false,
    createdAt: '2026-03-03T10:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    userId: '01900000-0000-7000-8000-000000000010',
    absenceId: '01900000-0000-7000-8000-000000000021',
    type: 'status_change',
    message: 'Tu ausencia ha cambiado a: Aprobada',
    read: true,
    createdAt: '2026-03-02T14:30:00.000Z',
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
      <NotificationsList />
    </QueryClientProvider>
  );
}

describe('NotificationsList', () => {
  it('muestra estado de carga inicialmente', () => {
    server.use(
      http.get('*/notifications', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json([]);
      })
    );

    renderComponent();

    expect(screen.getByText('Cargando notificaciones…')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay notificaciones', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json([])));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No tienes notificaciones nuevas.')).toBeInTheDocument();
    });
  });

  it('muestra lista de notificaciones', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json(mockNotifications)));

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Nueva ausencia de Juan Pérez asignada para validación')
      ).toBeInTheDocument();
      expect(screen.getByText('Tu ausencia ha cambiado a: Aprobada')).toBeInTheDocument();
    });
  });

  it('muestra el conteo de notificaciones no leídas', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json(mockNotifications)));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('diferencia visualmente entre notificaciones leídas y no leídas', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json(mockNotifications)));

    renderComponent();

    await waitFor(() => {
      const unreadNotification = screen
        .getByText('Nueva ausencia de Juan Pérez asignada para validación')
        .closest(String.raw`div.border-primary\/20`);
      const readNotification = screen
        .getByText('Tu ausencia ha cambiado a: Aprobada')
        .closest(String.raw`div.bg-muted\/30`);

      expect(unreadNotification).toBeInTheDocument();
      expect(readNotification).toBeInTheDocument();
    });
  });

  it('muestra botón de marcar como leída solo en notificaciones no leídas', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json(mockNotifications)));

    renderComponent();

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Marcar como leída' });
      expect(buttons).toHaveLength(1);
    });
  });

  it('marca notificación como leída al hacer clic en el botón', async () => {
    const user = userEvent.setup();

    let notificationsData = [...mockNotifications];

    server.use(
      http.get('*/notifications', () => HttpResponse.json(notificationsData)),
      http.patch('*/notifications/:id/read', ({ params }) => {
        const { id } = params;
        // Update the notification to read in the mock data
        notificationsData = notificationsData.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        );
        return HttpResponse.json({ success: true });
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Nueva ausencia de Juan Pérez asignada para validación')
      ).toBeInTheDocument();
    });

    const markAsReadButton = screen.getByRole('button', { name: 'Marcar como leída' });
    await user.click(markAsReadButton);

    // El botón debería desaparecer después de marcar como leída
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Marcar como leída' })).not.toBeInTheDocument();
    });
  });

  it('muestra error cuando falla la carga de notificaciones', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.error()));

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Error al cargar las notificaciones. Por favor, inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('muestra tiempo relativo de creación', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json(mockNotifications)));

    renderComponent();

    await waitFor(() => {
      const timeElements = screen.getAllByText(/hace/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });
});
