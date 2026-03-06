import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { UserRole } from '@repo/types';
import type { User } from '@repo/types';
import { AdminPage } from './AdminPage';

const mockUsers: User[] = [
  {
    id: '01930000-0000-7000-8000-000000000001',
    name: 'Ana García',
    email: 'ana@example.com',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000002',
    name: 'Luis Pérez',
    email: 'luis@example.com',
    role: UserRole.VALIDATOR,
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000003',
    name: 'María López',
    email: 'maria@example.com',
    role: UserRole.AUDITOR,
    isActive: false,
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
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

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { queryClient };
}

describe('AdminPage: listado de usuarios', () => {
  it('muestra el título y la descripción de la página', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    });
    expect(screen.getByText('Gestión de usuarios del sistema.')).toBeInTheDocument();
  });

  it('muestra el botón para crear nuevo usuario', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument();
    });
  });

  it('muestra estado de carga mientras se obtienen los usuarios', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Cargando usuarios…')).toBeInTheDocument();
    });
  });

  it('muestra la lista de usuarios después de cargar', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('María López')).toBeInTheDocument();
  });

  it('muestra los correos electrónicos de los usuarios', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('luis@example.com')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
  });

  it('muestra las etiquetas de rol correctas', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Empleado')).toBeInTheDocument();
    });

    expect(screen.getByText('Validador')).toBeInTheDocument();
    expect(screen.getByText('Auditor')).toBeInTheDocument();
  });

  it('muestra el estado activo/inactivo de cada usuario', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getAllByText('Activo')).toHaveLength(2);
    });

    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando falla la carga de usuarios', async () => {
    server.use(http.get('*/users', () => new HttpResponse(null, { status: 500 })));

    renderAdminPage();

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo cargar la lista de usuarios. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando no hay usuarios registrados', async () => {
    server.use(http.get('*/users', () => HttpResponse.json([])));

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('No hay usuarios registrados.')).toBeInTheDocument();
    });
  });

  it('muestra botones de acción para cada usuario', async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    expect(editButtons).toHaveLength(3);

    const deactivateButtons = screen.getAllByRole('button', { name: 'Desactivar' });
    expect(deactivateButtons).toHaveLength(2);
  });
});

describe('AdminPage: creación de usuario', () => {
  it('abre el diálogo de creación al hacer clic en "Nuevo usuario"', async () => {
    const user = userEvent.setup();
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));

    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
  });

  it('crea un nuevo usuario y actualiza la lista', async () => {
    const user = userEvent.setup();
    const newUser: User = {
      id: '01930000-0000-7000-8000-000000000004',
      name: 'Carlos Ruiz',
      email: 'carlos@example.com',
      role: UserRole.STANDARD,
      isActive: true,
      createdAt: '2024-01-04T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z',
    };

    server.use(
      http.post('*/users', () => HttpResponse.json({ id: newUser.id }, { status: 201 })),
      http.get('*/users', () => HttpResponse.json([...mockUsers, newUser]))
    );

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));

    await user.type(screen.getByLabelText('Nombre'), 'Carlos Ruiz');
    await user.type(screen.getByLabelText('Correo electrónico'), 'carlos@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Usuario creado' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    });

    expect(screen.getByText('carlos@example.com')).toBeInTheDocument();
  });
});

describe('AdminPage: equipos', () => {
  it('muestra el tab de equipos y el botón de crear', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/teams', () =>
        HttpResponse.json([
          {
            id: '01930000-0000-7000-8000-000000000201',
            name: 'Plataforma',
            color: '#2563EB',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ])
      )
    );

    renderAdminPage();

    await user.click(await screen.findByRole('tab', { name: 'Equipos' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Equipos' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Nuevo equipo' })).toBeInTheDocument();
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  it('crea un equipo desde el formulario y lo muestra en la tabla', async () => {
    const user = userEvent.setup();
    const teamsState: Array<{
      id: string;
      name: string;
      color: string;
      createdAt: string;
      updatedAt: string;
    }> = [];

    server.use(
      http.get('*/teams', () => HttpResponse.json(teamsState)),
      http.post('*/teams', async ({ request }) => {
        const body = (await request.json()) as { name: string; color: string };
        teamsState.push({
          id: '01930000-0000-7000-8000-000000000220',
          name: body.name,
          color: body.color,
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        });
        return HttpResponse.json({ id: '01930000-0000-7000-8000-000000000220' }, { status: 201 });
      })
    );

    renderAdminPage();

    await user.click(await screen.findByRole('tab', { name: 'Equipos' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nuevo equipo' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Nuevo equipo' }));
    await user.type(screen.getByLabelText('Nombre'), 'Operaciones');
    await user.clear(screen.getByLabelText('Color (HEX)'));
    await user.type(screen.getByLabelText('Color (HEX)'), '#F59E0B');
    await user.click(screen.getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => {
      expect(screen.getByText('Operaciones')).toBeInTheDocument();
    });

    expect(screen.getByText('#F59E0B')).toBeInTheDocument();
  });
});

describe('AdminPage: edición de usuario', () => {
  it('abre el diálogo de edición con los datos del usuario', async () => {
    const user = userEvent.setup();
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const row = screen.getByText('Ana García').closest('tr');
    const editButton = within(row!).getByRole('button', { name: 'Editar' });

    await user.click(editButton);

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana García');
  });

  it('actualiza el usuario y refresca la lista', async () => {
    const user = userEvent.setup();
    const updatedUsers = mockUsers.map((u) =>
      u.id === '01930000-0000-7000-8000-000000000001' ? { ...u, name: 'Ana García Actualizada' } : u
    );

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const row = screen.getByText('Ana García').closest('tr');
    const editButton = within(row!).getByRole('button', { name: 'Editar' });

    await user.click(editButton);

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ana García Actualizada');

    server.use(
      http.patch('*/users/*', () => new HttpResponse(null, { status: 200 })),
      http.get('*/users', () => HttpResponse.json(updatedUsers))
    );

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByText('Ana García Actualizada')).toBeInTheDocument();
    });
  });
});

describe('AdminPage: desactivación de usuario', () => {
  it('desactiva un usuario y actualiza la lista', async () => {
    const user = userEvent.setup();
    const updatedUsers = mockUsers.map((u) =>
      u.id === '01930000-0000-7000-8000-000000000001' ? { ...u, isActive: false } : u
    );

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const rows = screen.getAllByText('Ana García');
    const firstRow = rows[0].closest('tr');
    const deactivateButton = within(firstRow!).getByRole('button', { name: 'Desactivar' });

    server.use(
      http.delete('*/users/*', () => new HttpResponse(null, { status: 200 })),
      http.get('*/users', () => HttpResponse.json(updatedUsers))
    );

    await user.click(deactivateButton);

    await waitFor(() => {
      expect(screen.getAllByText('Inactivo')).toHaveLength(2);
    });
  });

  it('muestra estado de carga durante la desactivación', async () => {
    const user = userEvent.setup();

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const rows = screen.getAllByText('Ana García');
    const firstRow = rows[0].closest('tr');
    const deactivateButton = within(firstRow!).getByRole('button', { name: 'Desactivar' });

    server.use(
      http.delete('*/users/*', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new HttpResponse(null, { status: 200 });
      })
    );

    const clickPromise = user.click(deactivateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Desactivando…' })).toBeInTheDocument();
    });

    await clickPromise;
  });

  it('muestra mensaje de error cuando falla la desactivación', async () => {
    const user = userEvent.setup();
    server.use(http.delete('*/users/*', () => new HttpResponse(null, { status: 500 })));

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const row = screen.getByText('Ana García').closest('tr');
    const deactivateButton = within(row!).getByRole('button', { name: 'Desactivar' });

    await user.click(deactivateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Error al desactivar el usuario. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('muestra mensaje de error específico cuando el usuario no existe (404)', async () => {
    const user = userEvent.setup();
    server.use(http.delete('*/users/*', () => new HttpResponse(null, { status: 404 })));

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    const row = screen.getByText('Ana García').closest('tr');
    const deactivateButton = within(row!).getByRole('button', { name: 'Desactivar' });

    await user.click(deactivateButton);

    await waitFor(() => {
      expect(screen.getByText('Usuario no encontrado.')).toBeInTheDocument();
    });
  });
});

describe('AdminPage: navegación', () => {
  it('muestra el enlace de volver al inicio', async () => {
    renderAdminPage();

    const link = await screen.findByRole('link', { name: /volver al inicio/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});

describe('AdminPage: tipos de ausencia', () => {
  it('muestra el tab de tipos de ausencia y la tabla', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/absence-types', () =>
        HttpResponse.json([
          {
            id: '01930000-0000-7000-8000-000000000101',
            name: 'Vacaciones',
            unit: 'DAYS',
            maxPerYear: 30,
            minDuration: 1,
            maxDuration: 15,
            requiresValidation: true,
            allowPastDates: false,
            minDaysInAdvance: 7,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ])
      )
    );

    renderAdminPage();

    await user.click(await screen.findByRole('tab', { name: 'Tipos de Ausencia' }));

    await waitFor(() => {
      expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /Editar tipo de ausencia Vacaciones/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Desactivar tipo de ausencia Vacaciones/i })
    ).toBeInTheDocument();
  });

  it('refresca la lista de tipos de ausencia tras editar', async () => {
    const user = userEvent.setup();
    const updatedAbsenceTypes = [
      {
        id: '01930000-0000-7000-8000-000000000101',
        name: 'Vacaciones Anuales',
        unit: 'DAYS',
        maxPerYear: 30,
        minDuration: 1,
        maxDuration: 15,
        requiresValidation: true,
        allowPastDates: false,
        minDaysInAdvance: 7,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    server.use(
      http.get('*/absence-types', () =>
        HttpResponse.json([
          {
            id: '01930000-0000-7000-8000-000000000101',
            name: 'Vacaciones',
            unit: 'DAYS',
            maxPerYear: 30,
            minDuration: 1,
            maxDuration: 15,
            requiresValidation: true,
            allowPastDates: false,
            minDaysInAdvance: 7,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ])
      )
    );

    renderAdminPage();

    await user.click(await screen.findByRole('tab', { name: 'Tipos de Ausencia' }));

    await waitFor(() => {
      expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /Editar tipo de ausencia Vacaciones/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Editar tipo de ausencia' })).toBeInTheDocument();
    });

    server.use(
      http.patch('*/absence-types/*', () => new HttpResponse(null, { status: 200 })),
      http.get('*/absence-types', () => HttpResponse.json(updatedAbsenceTypes))
    );

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Vacaciones Anuales');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByText('Vacaciones Anuales')).toBeInTheDocument();
    });
  });
});
