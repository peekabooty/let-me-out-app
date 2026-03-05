import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@repo/types';
import { TeamsTable } from './TeamsTable';

const teams: Team[] = [
  {
    id: '01930000-0000-7000-8000-000000000201',
    name: 'Plataforma',
    color: '#2563EB',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '01930000-0000-7000-8000-000000000202',
    name: 'Operaciones',
    color: '#F59E0B',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('TeamsTable', () => {
  it('renders empty state', () => {
    render(<TeamsTable teams={[]} />);
    expect(screen.getByText('No hay equipos registrados.')).toBeInTheDocument();
  });

  it('renders team rows with names and colors', () => {
    render(<TeamsTable teams={teams} />);

    expect(screen.getByText('Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Operaciones')).toBeInTheDocument();
    expect(screen.getByText('#2563EB')).toBeInTheDocument();
    expect(screen.getByText('#F59E0B')).toBeInTheDocument();
  });

  it('does not render actions column when onManageMembers is not provided', () => {
    render(<TeamsTable teams={teams} />);
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestionar miembros' })).not.toBeInTheDocument();
  });

  it('renders actions column when onManageMembers is provided', () => {
    render(<TeamsTable teams={teams} onManageMembers={vi.fn()} />);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Gestionar miembros' });
    expect(buttons).toHaveLength(2);
  });

  it('calls onManageMembers with the correct team when button clicked', async () => {
    const user = userEvent.setup();
    const onManageMembers = vi.fn();
    render(<TeamsTable teams={teams} onManageMembers={onManageMembers} />);

    const buttons = screen.getAllByRole('button', { name: 'Gestionar miembros' });
    await user.click(buttons[0]);

    expect(onManageMembers).toHaveBeenCalledTimes(1);
    expect(onManageMembers).toHaveBeenCalledWith(teams[0]);
  });
});
