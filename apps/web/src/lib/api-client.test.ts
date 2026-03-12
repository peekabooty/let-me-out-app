import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Theme } from '@repo/types';

import { UserRole, useAuthStore } from '../store/auth.store';
import { apiClient, updateMyTheme } from './api-client';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, isLoading: false });
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('apiClient: configuracion base', () => {
  it('tiene withCredentials en true', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('tiene baseURL configurada', () => {
    expect(apiClient.defaults.baseURL).toBeDefined();
    expect(typeof apiClient.defaults.baseURL).toBe('string');
  });
});

describe('apiClient: interceptor de 401', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'location', 'get').mockReturnValue({
      ...globalThis.location,
      replace: vi.fn(),
    });
  });

  it('redirige a /login y limpia la sesion cuando una peticion devuelve 401', async () => {
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    server.use(
      http.get(`${baseURL}/absences`, () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const replaceSpy = vi.spyOn(globalThis.location, 'replace');
    useAuthStore.setState({
      user: { id: '1', name: 'Ana', email: 'a@b.com', role: UserRole.STANDARD, isActive: true },
      isLoading: false,
    });

    await apiClient.get('/absences').catch(() => null);

    expect(useAuthStore.getState().user).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('no redirige a /login cuando /auth/me devuelve 401', async () => {
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    server.use(
      http.get(`${baseURL}/auth/me`, () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const replaceSpy = vi.spyOn(globalThis.location, 'replace');

    await apiClient.get('/auth/me').catch(() => null);

    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('no redirige cuando la peticion es exitosa', async () => {
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    server.use(
      http.get(`${baseURL}/absences`, () => {
        return HttpResponse.json([]);
      })
    );

    const replaceSpy = vi.spyOn(globalThis.location, 'replace');

    await apiClient.get('/absences');

    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('no redirige cuando la peticion devuelve 403', async () => {
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    server.use(
      http.get(`${baseURL}/absences`, () => {
        return new HttpResponse(null, { status: 403 });
      })
    );

    const replaceSpy = vi.spyOn(globalThis.location, 'replace');

    await apiClient.get('/absences').catch(() => null);

    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

describe('apiClient: updateMyTheme', () => {
  it('envia PATCH /users/me/theme con el tema seleccionado', async () => {
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    let payload: unknown;

    server.use(
      http.patch(`${baseURL}/users/me/theme`, async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json(null, { status: 204 });
      })
    );

    await updateMyTheme({ theme: Theme.CARAMEL });

    expect(payload).toEqual({ theme: Theme.CARAMEL });
  });
});
