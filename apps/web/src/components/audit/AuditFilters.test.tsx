import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Team } from '@repo/types';

import { AuditFilters } from './AuditFilters';

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: '01930000-0000-7000-8000-000000000001',
  name: 'Equipo Alpha',
  color: '#FF5733',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('AuditFilters', () => {
  it('renders all filter controls', () => {
    const teams = [makeTeam()];
    const onTeamChange = vi.fn();
    const onStatusChange = vi.fn();
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate={undefined}
        endDate={undefined}
        onTeamChange={onTeamChange}
        onStatusChange={onStatusChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
    );

    expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha fin')).toBeInTheDocument();
  });

  it('calls onStartDateChange when date input changes', async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    const teams = [makeTeam()];

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate={undefined}
        endDate={undefined}
        onTeamChange={vi.fn()}
        onStatusChange={vi.fn()}
        onStartDateChange={onStartDateChange}
        onEndDateChange={vi.fn()}
      />
    );

    const startDateInput = screen.getByLabelText('Fecha inicio');
    await user.type(startDateInput, '2024-07-01');

    expect(onStartDateChange).toHaveBeenCalledWith('2024-07-01');
  });

  it('calls onEndDateChange when date input changes', async () => {
    const user = userEvent.setup();
    const onEndDateChange = vi.fn();
    const teams = [makeTeam()];

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate={undefined}
        endDate={undefined}
        onTeamChange={vi.fn()}
        onStatusChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onEndDateChange={onEndDateChange}
      />
    );

    const endDateInput = screen.getByLabelText('Fecha fin');
    await user.type(endDateInput, '2024-07-31');

    expect(onEndDateChange).toHaveBeenCalledWith('2024-07-31');
  });

  it('displays selected date values in inputs', () => {
    const teams = [makeTeam()];

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate="2024-07-01"
        endDate="2024-07-31"
        onTeamChange={vi.fn()}
        onStatusChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Fecha inicio')).toHaveValue('2024-07-01');
    expect(screen.getByLabelText('Fecha fin')).toHaveValue('2024-07-31');
  });

  it('calls onStartDateChange with undefined when input is cleared', async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    const teams = [makeTeam()];

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate="2024-07-01"
        endDate={undefined}
        onTeamChange={vi.fn()}
        onStatusChange={vi.fn()}
        onStartDateChange={onStartDateChange}
        onEndDateChange={vi.fn()}
      />
    );

    const startDateInput = screen.getByLabelText('Fecha inicio');
    await user.clear(startDateInput);

    expect(onStartDateChange).toHaveBeenCalledWith(undefined);
  });

  it('renders team options in select', () => {
    const teams = [
      makeTeam({ id: '01930000-0000-7000-8000-000000000001', name: 'Equipo Alpha' }),
      makeTeam({ id: '01930000-0000-7000-8000-000000000002', name: 'Equipo Beta' }),
    ];

    render(
      <AuditFilters
        teams={teams}
        selectedTeamId={undefined}
        selectedStatus={undefined}
        startDate={undefined}
        endDate={undefined}
        onTeamChange={vi.fn()}
        onStatusChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Equipo')).toBeInTheDocument();
  });
});
