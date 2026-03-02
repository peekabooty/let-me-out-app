import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AbsenceUnit } from '@repo/types';
import type { AbsenceType } from '@repo/types';

import { AbsenceTypesTable } from './AbsenceTypesTable';

const makeAbsenceType = (overrides: Partial<AbsenceType> = {}): AbsenceType => ({
  id: '01930000-0000-7000-8000-000000000001',
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
  ...overrides,
});

describe('AbsenceTypesTable', () => {
  it('renders empty state when no absence types are provided', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('No hay tipos de ausencia registrados.')).toBeInTheDocument();
  });

  it('renders a row for each absence type', () => {
    const absenceTypes = [
      makeAbsenceType({ id: '01930000-0000-7000-8000-000000000001', name: 'Vacaciones' }),
      makeAbsenceType({
        id: '01930000-0000-7000-8000-000000000002',
        name: 'Baja médica',
      }),
    ];
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={absenceTypes}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Baja médica')).toBeInTheDocument();
  });

  it('displays the correct unit label for each AbsenceUnit', () => {
    const absenceTypes = [
      makeAbsenceType({ id: '01930000-0000-7000-8000-000000000001', unit: AbsenceUnit.DAYS }),
      makeAbsenceType({
        id: '01930000-0000-7000-8000-000000000002',
        name: 'Permiso corto',
        unit: AbsenceUnit.HOURS,
      }),
    ];
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={absenceTypes}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getAllByText('Días')[0]).toBeInTheDocument();
    expect(screen.getByText('Horas')).toBeInTheDocument();
  });

  it('shows "Activo" badge for active absence types', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ isActive: true })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows "Inactivo" badge for inactive absence types', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ isActive: false })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('displays "Sí" for requiresValidation when true', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ requiresValidation: true })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    const cells = screen.getAllByText('Sí');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('displays "No" for requiresValidation when false', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ requiresValidation: false, allowPastDates: false })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    const cells = screen.getAllByText('No');
    expect(cells.length).toBe(2);
  });

  it('displays "—" for minDaysInAdvance when null', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ minDaysInAdvance: null })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('displays numeric value for minDaysInAdvance when set', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ minDaysInAdvance: 21, maxDuration: 10 })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const absenceType = makeAbsenceType({ name: 'Vacaciones' });
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[absenceType]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    await user.click(screen.getByRole('button', { name: /Editar tipo de ausencia Vacaciones/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(absenceType);
  });

  it('calls onDeactivate when deactivate button is clicked for active absence type', async () => {
    const user = userEvent.setup();
    const absenceType = makeAbsenceType({ name: 'Vacaciones', isActive: true });
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[absenceType]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /Desactivar tipo de ausencia Vacaciones/i })
    );

    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(onDeactivate).toHaveBeenCalledWith(absenceType);
  });

  it('does not show deactivate button for inactive absence types', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType({ name: 'Vacaciones', isActive: false })]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(
      screen.queryByRole('button', { name: /Desactivar tipo de ausencia Vacaciones/i })
    ).not.toBeInTheDocument();
  });

  it('renders all table columns', () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();

    render(
      <AbsenceTypesTable
        absenceTypes={[makeAbsenceType()]}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        deactivatingId={null}
      />
    );

    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Unidad')).toBeInTheDocument();
    expect(screen.getByText('Máx/Año')).toBeInTheDocument();
    expect(screen.getByText('Duración mín')).toBeInTheDocument();
    expect(screen.getByText('Duración máx')).toBeInTheDocument();
    expect(screen.getByText('Validación')).toBeInTheDocument();
    expect(screen.getByText('Fechas pasadas')).toBeInTheDocument();
    expect(screen.getByText('Días anticipación')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });
});
