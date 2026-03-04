import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
