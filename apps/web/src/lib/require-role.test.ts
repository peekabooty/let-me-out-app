import { redirect } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../store/auth.store';
import { requireRole } from './require-role';

vi.mock('@tanstack/react-router', () => ({
  redirect: vi.fn((args: { to: string }) => {
    throw new Error(`redirect:${args.to}`);
  }),
}));

afterEach(() => {
  useAuthStore.setState({ user: null, isLoading: false });
  vi.clearAllMocks();
});

describe('requireRole', () => {
  it('no lanza cuando el usuario tiene el rol permitido', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
      },
      isLoading: false,
    });

    expect(() => requireRole(['ADMIN'])).not.toThrow();
  });

  it('redirige a /unauthorized cuando el usuario no tiene el rol requerido', () => {
    useAuthStore.setState({
      user: {
        id: '2',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'EMPLOYEE',
        isActive: true,
      },
      isLoading: false,
    });

    expect(() => requireRole(['ADMIN'])).toThrow('redirect:/unauthorized');
    expect(redirect).toHaveBeenCalledWith({ to: '/unauthorized' });
  });

  it('redirige a /unauthorized cuando no hay sesion activa', () => {
    useAuthStore.setState({ user: null, isLoading: false });

    expect(() => requireRole(['ADMIN'])).toThrow('redirect:/unauthorized');
    expect(redirect).toHaveBeenCalledWith({ to: '/unauthorized' });
  });

  it('no lanza cuando el rol del usuario es uno de los varios permitidos', () => {
    useAuthStore.setState({
      user: {
        id: '3',
        name: 'Val',
        email: 'val@example.com',
        role: 'VALIDATOR',
        isActive: true,
      },
      isLoading: false,
    });

    expect(() => requireRole(['ADMIN', 'VALIDATOR'])).not.toThrow();
  });

  it('redirige cuando el rol del usuario no esta en la lista de varios roles permitidos', () => {
    useAuthStore.setState({
      user: {
        id: '4',
        name: 'Emp',
        email: 'emp@example.com',
        role: 'EMPLOYEE',
        isActive: true,
      },
      isLoading: false,
    });

    expect(() => requireRole(['ADMIN', 'VALIDATOR'])).toThrow('redirect:/unauthorized');
  });
});
