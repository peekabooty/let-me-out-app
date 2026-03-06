import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { UserRole } from '@repo/types';
import type { User } from '@repo/types';
import { UserFormDialog } from './UserFormDialog';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(props: Partial<Parameters<typeof UserFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <UserFormDialog
        open={true}
        onOpenChange={onOpenChange}
        user={undefined}
        onSuccess={onSuccess}
        {...props}
      />
    </QueryClientProvider>
  );

  return { onOpenChange, onSuccess };
}

const mockUser: User = {
  id: '01900000-0000-7000-8000-000000000001',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: UserRole.STANDARD,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('UserFormDialog: modo crear', () => {
  it('muestra el formulario de creación cuando no se pasa usuario', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeInTheDocument();
  });

  it('muestra errores de validación al enviar el formulario vacío', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('muestra error al enviar un correo inválido', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Test User');
    await user.type(screen.getByLabelText('Correo electrónico'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('muestra mensaje de confirmación con el email tras crear el usuario', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/users', () => HttpResponse.json({ id: 'new-id' }, { status: 201 })));

    const { onSuccess } = renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Nuevo Usuario');
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Se ha enviado un email de activación a/)).toBeInTheDocument();
      expect(screen.getByText('nuevo@example.com')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('cierra el diálogo al pulsar Cerrar tras crear el usuario', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/users', () => HttpResponse.json({ id: 'new-id' }, { status: 201 })));

    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Nuevo Usuario');
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('muestra error de conflicto cuando el correo ya existe (409)', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/users', () => new HttpResponse(null, { status: 409 })));

    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Otro Usuario');
    await user.type(screen.getByLabelText('Correo electrónico'), 'duplicado@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un usuario con ese correo electrónico.')
      ).toBeInTheDocument();
    });
  });

  it('muestra error genérico ante un fallo inesperado de la API', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/users', () => new HttpResponse(null, { status: 500 })));

    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Otro Usuario');
    await user.type(screen.getByLabelText('Correo electrónico'), 'otro@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => {
      expect(
        screen.getByText('Error al crear el usuario. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });
});

describe('UserFormDialog: modo editar', () => {
  it('muestra el formulario de edición con los datos del usuario', () => {
    renderDialog({ user: mockUser });

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Garcia');
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });

  it('llama a onSuccess y cierra el diálogo al guardar cambios correctamente', async () => {
    const user = userEvent.setup();
    server.use(http.patch('*/users/*', () => new HttpResponse(null, { status: 200 })));

    const { onSuccess, onOpenChange } = renderDialog({ user: mockUser });

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nombre Actualizado');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('muestra error genérico ante un fallo al actualizar', async () => {
    const user = userEvent.setup();
    server.use(http.patch('*/users/*', () => new HttpResponse(null, { status: 500 })));

    renderDialog({ user: mockUser });

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(
        screen.getByText('Error al actualizar el usuario. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('muestra error de validación al borrar el nombre en modo edición', async () => {
    const user = userEvent.setup();
    renderDialog({ user: mockUser });

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
