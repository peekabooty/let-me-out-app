import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { UserRole, useAuthStore } from './auth.store';
import type { SessionUser } from './auth.store';

const mockUser: SessionUser = {
  id: '01900000-0000-7000-8000-000000000001',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: UserRole.STANDARD,
  isActive: true,
};

afterEach(() => {
  useAuthStore.setState({ user: null, isLoading: true });
});

describe('useAuthStore: estado inicial', () => {
  it('inicia sin usuario', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
  });

  it('inicia con isLoading en true', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useAuthStore: setUser', () => {
  it('almacena el usuario y desactiva isLoading', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('almacena el campo isActive del usuario', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user?.isActive).toBe(true);
  });

  it('acepta un usuario con isActive en false', () => {
    const { result } = renderHook(() => useAuthStore());
    const inactiveUser: SessionUser = { ...mockUser, isActive: false };

    act(() => {
      result.current.setUser(inactiveUser);
    });

    expect(result.current.user?.isActive).toBe(false);
  });

  it('acepta null para limpiar el usuario', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAuthStore: clearSession', () => {
  it('elimina el usuario y desactiva isLoading', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser(mockUser);
    });

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAuthStore: setLoading', () => {
  it('actualiza isLoading de forma independiente', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAuthStore: SessionUser campos minimos', () => {
  it('el tipo SessionUser incluye id, name, role, isActive y email', () => {
    const user: SessionUser = {
      id: 'some-uuid',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.VALIDATOR,
      isActive: true,
    };

    expect(user.id).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.isActive).toBeDefined();
    expect(user.email).toBeDefined();
  });
});
