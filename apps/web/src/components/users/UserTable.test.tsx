import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@repo/types';
import type { User } from '@repo/types';

import { UserTable } from './UserTable';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '01930000-0000-7000-8000-000000000001',
  name: 'Ana García',
  email: 'ana@example.com',
  role: UserRole.STANDARD,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('UserTable', () => {
  it('renders empty state when no users are provided', () => {
    render(<UserTable users={[]} />);

    expect(screen.getByText('No hay usuarios registrados.')).toBeInTheDocument();
  });

  it('renders a row for each user', () => {
    const users = [
      makeUser({ id: '01930000-0000-7000-8000-000000000001', name: 'Ana García' }),
      makeUser({
        id: '01930000-0000-7000-8000-000000000002',
        name: 'Luis Pérez',
        email: 'luis@example.com',
      }),
    ];

    render(<UserTable users={users} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('displays the correct role label for each UserRole', () => {
    const users = [
      makeUser({ id: '01930000-0000-7000-8000-000000000001', role: UserRole.STANDARD }),
      makeUser({
        id: '01930000-0000-7000-8000-000000000002',
        role: UserRole.VALIDATOR,
        email: 'v@example.com',
      }),
      makeUser({
        id: '01930000-0000-7000-8000-000000000003',
        role: UserRole.AUDITOR,
        email: 'a@example.com',
      }),
      makeUser({
        id: '01930000-0000-7000-8000-000000000004',
        role: UserRole.ADMIN,
        email: 'ad@example.com',
      }),
    ];

    render(<UserTable users={users} />);

    expect(screen.getByText('Empleado')).toBeInTheDocument();
    expect(screen.getByText('Validador')).toBeInTheDocument();
    expect(screen.getByText('Auditor')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('shows "Activo" badge for active users', () => {
    render(<UserTable users={[makeUser({ isActive: true })]} />);

    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows "Inactivo" badge for inactive users', () => {
    render(<UserTable users={[makeUser({ isActive: false })]} />);

    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<UserTable users={[makeUser({ email: 'test@company.com' })]} />);

    expect(screen.getByText('test@company.com')).toBeInTheDocument();
  });
});
