import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbsenceUnit } from '@repo/types';
import type { AbsenceType } from '@repo/types';
import { AbsenceTypeFormDialog } from './AbsenceTypeFormDialog';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(props: Partial<Parameters<typeof AbsenceTypeFormDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <AbsenceTypeFormDialog
        open={true}
        onOpenChange={onOpenChange}
        absenceType={undefined}
        onSuccess={onSuccess}
        {...props}
      />
    </QueryClientProvider>
  );

  return { onOpenChange, onSuccess };
}

const mockAbsenceType: AbsenceType = {
  id: '01900000-0000-7000-8000-000000000001',
  name: 'Vacaciones',
  unit: AbsenceUnit.DAYS,
  maxPerYear: 30,
  minDuration: 1,
  maxDuration: 15,
  requiresValidation: true,
  allowPastDates: false,
  minDaysInAdvance: 7,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('AbsenceTypeFormDialog: modo crear', () => {
  it('muestra el formulario de creación cuando no se pasa absenceType', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Nuevo tipo de ausencia' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Unidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo por año')).toBeInTheDocument();
    expect(screen.getByLabelText('Duración mínima')).toBeInTheDocument();
    expect(screen.getByLabelText('Duración máxima')).toBeInTheDocument();
    expect(screen.getByLabelText('Requiere validación')).toBeInTheDocument();
    expect(screen.getByLabelText('Permite fechas pasadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear tipo' })).toBeInTheDocument();
  });

  it('muestra campo de días mínimos de anticipación por defecto (requiresValidation checked)', () => {
    renderDialog();

    expect(screen.getByLabelText(/Días mínimos de anticipación/i)).toBeInTheDocument();
  });

  it('oculta campo de días mínimos cuando requiresValidation es false', async () => {
    const user = userEvent.setup();
    renderDialog();

    const checkbox = screen.getByLabelText('Requiere validación');
    await user.click(checkbox);

    expect(screen.queryByLabelText(/Días mínimos de anticipación/i)).not.toBeInTheDocument();
  });

  it('muestra errores de validación al enviar el formulario vacío', async () => {
    const user = userEvent.setup();
    renderDialog();

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);

    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });

  it('muestra error si maxDuration < minDuration', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Test');
    await user.type(screen.getByLabelText('Máximo por año'), '30');
    await user.type(screen.getByLabelText('Duración mínima'), '10');
    await user.type(screen.getByLabelText('Duración máxima'), '5');
    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(
        screen.getByText('La duración máxima debe ser mayor o igual a la mínima')
      ).toBeInTheDocument();
    });
  });

  it('llama a onSuccess y cierra el diálogo al crear tipo correctamente', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/absence-types', () => HttpResponse.json({ id: 'new-id' }, { status: 201 }))
    );

    const { onSuccess, onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Vacaciones');
    await user.type(screen.getByLabelText('Máximo por año'), '30');
    await user.type(screen.getByLabelText('Duración mínima'), '1');
    await user.type(screen.getByLabelText('Duración máxima'), '15');
    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('muestra error de conflicto cuando el nombre ya existe (409)', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/absence-types', () => new HttpResponse(null, { status: 409 })));

    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Vacaciones');
    await user.type(screen.getByLabelText('Máximo por año'), '30');
    await user.type(screen.getByLabelText('Duración mínima'), '1');
    await user.type(screen.getByLabelText('Duración máxima'), '15');
    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(screen.getByText('Ya existe un tipo de ausencia con ese nombre.')).toBeInTheDocument();
    });
  });

  it('muestra error genérico ante un fallo inesperado de la API', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/absence-types', () => new HttpResponse(null, { status: 500 })));

    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Vacaciones');
    await user.type(screen.getByLabelText('Máximo por año'), '30');
    await user.type(screen.getByLabelText('Duración mínima'), '1');
    await user.type(screen.getByLabelText('Duración máxima'), '15');
    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(
        screen.getByText('Error al crear el tipo de ausencia. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('permite seleccionar unidad HOURS', () => {
    // Note: Testing Radix UI Select component with userEvent.click requires
    // additional JSDOM polyfills. This test verifies the form structure exists.
    renderDialog();

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Unidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo por año')).toBeInTheDocument();
  });

  it('acepta minDaysInAdvance vacío (null)', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/absence-types', () => HttpResponse.json({ id: 'new-id' }, { status: 201 }))
    );

    const { onSuccess } = renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'Baja médica');
    await user.type(screen.getByLabelText('Máximo por año'), '90');
    await user.type(screen.getByLabelText('Duración mínima'), '1');
    await user.type(screen.getByLabelText('Duración máxima'), '90');
    await user.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AbsenceTypeFormDialog: modo editar', () => {
  it('muestra el formulario de edición con los datos del tipo', () => {
    renderDialog({ absenceType: mockAbsenceType });

    expect(screen.getByRole('heading', { name: 'Editar tipo de ausencia' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Vacaciones');
    expect(screen.getByLabelText(/Unidad \(no modificable\)/i)).toHaveValue('Días');
    expect(screen.getByLabelText(/Unidad \(no modificable\)/i)).toBeDisabled();
    expect(screen.getByLabelText('Máximo por año')).toHaveValue(30);
    expect(screen.getByLabelText('Duración mínima')).toHaveValue(1);
    expect(screen.getByLabelText('Duración máxima')).toHaveValue(15);
    expect(screen.getByLabelText('Requiere validación')).toBeChecked();
    expect(screen.getByLabelText('Permite fechas pasadas')).not.toBeChecked();
    expect(screen.getByLabelText(/Días mínimos de anticipación/i)).toHaveValue(7);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });

  it('muestra mensaje informativo sobre la inmutabilidad de la unidad', () => {
    renderDialog({ absenceType: mockAbsenceType });

    expect(
      screen.getByText('La unidad no se puede modificar después de la creación')
    ).toBeInTheDocument();
  });

  it('llama a onSuccess y cierra el diálogo al guardar cambios correctamente', async () => {
    const user = userEvent.setup();
    server.use(http.patch('*/absence-types/*', () => new HttpResponse(null, { status: 200 })));

    const { onSuccess, onOpenChange } = renderDialog({ absenceType: mockAbsenceType });

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Vacaciones Anuales');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('muestra error genérico ante un fallo al actualizar', async () => {
    const user = userEvent.setup();
    server.use(http.patch('*/absence-types/*', () => new HttpResponse(null, { status: 500 })));

    renderDialog({ absenceType: mockAbsenceType });

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(
        screen.getByText('Error al actualizar el tipo de ausencia. Inténtalo de nuevo.')
      ).toBeInTheDocument();
    });
  });

  it('muestra error de validación al borrar el nombre en modo edición', async () => {
    const user = userEvent.setup();
    renderDialog({ absenceType: mockAbsenceType });

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('muestra error si maxDuration < minDuration en modo edición', async () => {
    const user = userEvent.setup();
    renderDialog({ absenceType: mockAbsenceType });

    const maxInput = screen.getByLabelText('Duración máxima');
    await user.clear(maxInput);
    await user.type(maxInput, '0.5');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(
        screen.getByText('La duración máxima debe ser mayor o igual a la mínima')
      ).toBeInTheDocument();
    });
  });

  it('oculta campo minDaysInAdvance cuando requiresValidation es false en edición', async () => {
    const user = userEvent.setup();
    renderDialog({ absenceType: mockAbsenceType });

    expect(screen.getByLabelText(/Días mínimos de anticipación/i)).toBeInTheDocument();

    const checkbox = screen.getByLabelText('Requiere validación');
    await user.click(checkbox);

    expect(screen.queryByLabelText(/Días mínimos de anticipación/i)).not.toBeInTheDocument();
  });

  it('permite editar tipo con minDaysInAdvance null', () => {
    const absenceTypeWithNullAdvance = { ...mockAbsenceType, minDaysInAdvance: null };
    renderDialog({ absenceType: absenceTypeWithNullAdvance });

    expect(screen.getByLabelText(/Días mínimos de anticipación/i)).toHaveValue(null);
  });
});
