import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AbsenceStatus } from '@repo/types';
import type { AuditAbsence } from '../../lib/api-client';

import { AuditAbsencesTable } from './AuditAbsencesTable';

const makeAbsence = (overrides: Partial<AuditAbsence> = {}): AuditAbsence => ({
  id: '01930000-0000-7000-8000-000000000001',
  userId: '01930000-0000-7000-8000-000000000011',
  userName: 'Ana García',
  absenceTypeId: '01930000-0000-7000-8000-000000000021',
  absenceTypeName: 'Vacaciones',
  startAt: '2024-07-01T00:00:00.000Z',
  endAt: '2024-07-05T00:00:00.000Z',
  duration: 5,
  status: AbsenceStatus.ACCEPTED,
  teamId: '01930000-0000-7000-8000-000000000031',
  teamName: 'Equipo Alpha',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
  ...overrides,
});

describe('AuditAbsencesTable', () => {
  it('renders empty state when no absences are provided', () => {
    render(<AuditAbsencesTable absences={[]} />);

    expect(
      screen.getByText('No se encontraron ausencias con los filtros seleccionados.')
    ).toBeInTheDocument();
  });

  it('renders a row for each absence', () => {
    const absences = [
      makeAbsence({ id: '01930000-0000-7000-8000-000000000001', userName: 'Ana García' }),
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000002',
        userName: 'Luis Pérez',
      }),
    ];

    render(<AuditAbsencesTable absences={absences} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('displays absence details correctly', () => {
    const absence = makeAbsence({
      userName: 'Ana García',
      absenceTypeName: 'Vacaciones',
      duration: 5,
      status: AbsenceStatus.ACCEPTED,
      teamName: 'Equipo Alpha',
    });

    render(<AuditAbsencesTable absences={[absence]} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Aceptada')).toBeInTheDocument();
    expect(screen.getByText('Equipo Alpha')).toBeInTheDocument();
  });

  it('shows "Sin equipo" when team is null', () => {
    render(<AuditAbsencesTable absences={[makeAbsence({ teamId: null, teamName: null })]} />);

    expect(screen.getByText('Sin equipo')).toBeInTheDocument();
  });

  it('displays all status labels correctly', () => {
    const absences = [
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000001',
        status: AbsenceStatus.WAITING_VALIDATION,
        userName: 'User 1',
      }),
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000002',
        status: AbsenceStatus.RECONSIDER,
        userName: 'User 2',
      }),
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000003',
        status: AbsenceStatus.ACCEPTED,
        userName: 'User 3',
      }),
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000004',
        status: AbsenceStatus.DISCARDED,
        userName: 'User 4',
      }),
      makeAbsence({
        id: '01930000-0000-7000-8000-000000000005',
        status: AbsenceStatus.CANCELLED,
        userName: 'User 5',
      }),
    ];

    render(<AuditAbsencesTable absences={absences} />);

    expect(screen.getByText('Esperando validación')).toBeInTheDocument();
    expect(screen.getByText('Reconsiderar')).toBeInTheDocument();
    expect(screen.getByText('Aceptada')).toBeInTheDocument();
    expect(screen.getByText('Descartada')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('formats dates in Spanish locale', () => {
    const absence = makeAbsence({
      startAt: '2024-07-01T00:00:00.000Z',
      endAt: '2024-07-15T00:00:00.000Z',
    });

    render(<AuditAbsencesTable absences={[absence]} />);

    expect(screen.getByText(/1\/7\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/15\/7\/2024/)).toBeInTheDocument();
  });
});
