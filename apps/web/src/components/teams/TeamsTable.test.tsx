import { render, screen, within } from '@testing-library/react';
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

  it('does not render actions column when no action props are provided', () => {
    render(<TeamsTable teams={teams} />);
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Gestionar miembros del equipo/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar equipo/i })).not.toBeInTheDocument();
  });

  it('renders actions column when onManageMembers is provided', () => {
    render(<TeamsTable teams={teams} onManageMembers={vi.fn()} />);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Gestionar miembros del equipo/i });
    expect(buttons).toHaveLength(2);
  });

  it('calls onManageMembers with the correct team when button clicked', async () => {
    const user = userEvent.setup();
    const onManageMembers = vi.fn();
    render(<TeamsTable teams={teams} onManageMembers={onManageMembers} />);

    const buttons = screen.getAllByRole('button', { name: /Gestionar miembros del equipo/i });
    await user.click(buttons[0]);

    expect(onManageMembers).toHaveBeenCalledTimes(1);
    expect(onManageMembers).toHaveBeenCalledWith(teams[0]);
  });

  it('renders delete buttons when onDelete is provided', () => {
    render(<TeamsTable teams={teams} onDelete={vi.fn()} />);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Eliminar equipo/i });
    expect(buttons).toHaveLength(2);
  });

  it('shows confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<TeamsTable teams={teams} onDelete={vi.fn()} />);

    const buttons = screen.getAllByRole('button', { name: /Eliminar equipo/i });
    await user.click(buttons[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Eliminar equipo')).toBeInTheDocument();
    expect(within(dialog).getByText(/Plataforma/)).toBeInTheDocument();
  });

  it('calls onDelete with the correct team after confirming', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TeamsTable teams={teams} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar equipo/i });
    await user.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'Eliminar' });
    await user.click(confirmButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(teams[0]);
  });

  it('closes confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TeamsTable teams={teams} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar equipo/i });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
