import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { useSession } from './use-session';
import { useAuthStore } from '../store/auth.store';

const mockUser = {
  id: '01234567-89ab-7def-0123-456789abcdef',
  name: 'Ana Garcia',
  email: 'ana@example.com',
  role: 'EMPLOYEE' as const,
  isActive: true,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
});
afterAll(() => server.close());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useSession', () => {
  it('returns isLoading=true initially', () => {
    server.use(
      http.get('*/auth/me', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json(mockUser);
      })
    );

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('returns the user and updates Zustand store on success', async () => {
    server.use(http.get('*/auth/me', () => HttpResponse.json(mockUser)));

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isError).toBe(false);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('returns isError=true and null user on API failure', async () => {
    server.use(http.get('*/auth/me', () => new HttpResponse(null, { status: 401 })));

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('does not update Zustand store on API failure', async () => {
    server.use(http.get('*/auth/me', () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(useAuthStore.getState().user).toBeNull();
  });
});
