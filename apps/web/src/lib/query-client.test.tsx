import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { queryClient } from '../lib/query-client';
import { shouldRetry } from '../lib/query-retry';

function makeAxiosError(status: number): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    { headers, url: '/test', method: 'get' },
    null,
    { status, statusText: '', data: null, headers, config: { headers } }
  );
}

function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

describe('queryClient defaults', () => {
  it('tiene staleTime de 60 segundos por defecto', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60 * 1000);
  });

  it('no reintenta mutations por defecto', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('tiene refetchOnWindowFocus activado', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
  });
});

describe('shouldRetry: logica de reintentos', () => {
  it('no reintenta en errores 401', () => {
    expect(shouldRetry(0, makeAxiosError(401))).toBe(false);
  });

  it('no reintenta en errores 403', () => {
    expect(shouldRetry(0, makeAxiosError(403))).toBe(false);
  });

  it('no reintenta en errores 404', () => {
    expect(shouldRetry(0, makeAxiosError(404))).toBe(false);
  });

  it('reintenta en el primer fallo con errores 500', () => {
    expect(shouldRetry(0, makeAxiosError(500))).toBe(true);
  });

  it('no reintenta en el segundo fallo con errores 500', () => {
    expect(shouldRetry(1, makeAxiosError(500))).toBe(false);
  });

  it('reintenta en el primer fallo con errores de red (sin response)', () => {
    const networkError = new Error('Network Error');
    expect(shouldRetry(0, networkError)).toBe(true);
  });
});

describe('QueryClient: comportamiento de retry en queries reales', () => {
  it('no reintenta en errores 401', async () => {
    const client = makeTestClient();
    let callCount = 0;

    function TestComponent() {
      useQuery({
        queryKey: ['test-401'],
        queryFn: () => {
          callCount++;
          return Promise.reject(makeAxiosError(401));
        },
      });
      return null;
    }

    render(
      <QueryClientProvider client={client}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => expect(callCount).toBe(1), { timeout: 3000 });
    expect(callCount).toBe(1);
  });

  it('reintenta una vez en errores 500', async () => {
    const client = makeTestClient();
    let callCount = 0;

    function TestComponent() {
      useQuery({
        queryKey: ['test-500'],
        queryFn: () => {
          callCount++;
          return Promise.reject(makeAxiosError(500));
        },
      });
      return null;
    }

    render(
      <QueryClientProvider client={client}>
        <TestComponent />
      </QueryClientProvider>
    );

    await waitFor(() => expect(callCount).toBe(2), { timeout: 5000 });
    expect(callCount).toBe(2);
  });
});
