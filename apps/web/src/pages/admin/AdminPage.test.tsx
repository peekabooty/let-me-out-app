import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import { UserRole } from '@repo/types';
import type { User } from '@repo/types';
import { AdminPage } from './AdminPage';

expect.extend(toHaveNoViolations);

const mockUsers: User[] = [
  {
    id: '01930000-0000-7000-8000-000000000001',
    name: 'Ana Garcia',
    email: 'ana@example.com',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000002',
    name: 'Luis Perez',
    email: 'luis@example.com',
    role: UserRole.VALIDATOR,
    isActive: false,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const server = setupServer(
  http.get('*/users', () => HttpResponse.json(mockUsers)),
  http.get('*/absence-types', () => HttpResponse.json([])),
  http.get('*/teams', () => HttpResponse.json([]))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const rootRoute = createRootRoute({ component: () => <AdminPage /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/admin'] }),
  });

  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { container };
}

describe('AdminPage users tab', () => {
  it('shows icon-only actions with correct visibility by user status', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    });

    const activeRow = screen.getByText('Ana Garcia').closest('tr');
    const inactiveRow = screen.getByText('Luis Perez').closest('tr');
    expect(activeRow).not.toBeNull();
    expect(inactiveRow).not.toBeNull();

    expect(
      within(activeRow as HTMLTableRowElement).getByRole('button', {
        name: 'Editar usuario Ana Garcia',
      })
    ).toBeInTheDocument();
    expect(
      within(activeRow as HTMLTableRowElement).getByRole('button', {
        name: 'Desactivar usuario Ana Garcia',
      })
    ).toBeInTheDocument();
    expect(
      within(activeRow as HTMLTableRowElement).queryByRole('button', {
        name: /Reenviar invitaci.n a Ana Garcia/i,
      })
    ).not.toBeInTheDocument();
    expect(
      within(activeRow as HTMLTableRowElement).queryByRole('button', {
        name: 'Eliminar usuario Ana Garcia',
      })
    ).not.toBeInTheDocument();

    expect(
      within(inactiveRow as HTMLTableRowElement).getByRole('button', {
        name: 'Editar usuario Luis Perez',
      })
    ).toBeInTheDocument();
    expect(
      within(inactiveRow as HTMLTableRowElement).getByRole('button', {
        name: /Reenviar invitaci.n a Luis Perez/i,
      })
    ).toBeInTheDocument();
    expect(
      within(inactiveRow as HTMLTableRowElement).getByRole('button', {
        name: 'Eliminar usuario Luis Perez',
      })
    ).toBeInTheDocument();
    expect(
      within(inactiveRow as HTMLTableRowElement).queryByRole('button', {
        name: 'Desactivar usuario Luis Perez',
      })
    ).not.toBeInTheDocument();
  });

  it('shows conflict error when permanent delete returns 409', async () => {
    const user = userEvent.setup();
    server.use(http.delete('*/users/:id/permanent', () => new HttpResponse(null, { status: 409 })));

    renderAdminPage();

    const deleteButton = await screen.findByRole('button', {
      name: 'Eliminar usuario Luis Perez',
    });
    await user.click(deleteButton);

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(
        screen.getByText('No se puede eliminar el usuario porque tiene ausencias activas.')
      ).toBeInTheDocument();
    });
  });

  it('shows specific resend error when user is already active', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/users/:id/resend-activation', () => new HttpResponse(null, { status: 400 }))
    );

    renderAdminPage();

    const resendButton = await screen.findByRole('button', {
      name: /Reenviar invitaci.n a Luis Perez/i,
    });
    await user.click(resendButton);

    await waitFor(() => {
      expect(
        screen.getByText('No se puede reenviar invitación a un usuario ya activo.')
      ).toBeInTheDocument();
    });
  });

  it('has no axe accessibility violations', async () => {
    const { container } = renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
