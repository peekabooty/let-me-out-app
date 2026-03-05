import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserRole } from '@repo/types';
import type { SessionUser } from '../../store/auth.store';
import { AppNav } from './AppNav';

function buildTestRouter(user: SessionUser) {
  const rootRoute = createRootRoute({
    component: () => <AppNav user={user} />,
  });

  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });

  const routeTree = rootRoute.addChildren([indexRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return router;
}

function renderNav(role: UserRole) {
  const user: SessionUser = {
    id: '01900000-0000-7000-8000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role,
    isActive: true,
  };

  const router = buildTestRouter(user);
  render(<RouterProvider router={router} />);
}

describe('AppNav', () => {
  describe('usuario STANDARD', () => {
    it('muestra el enlace al dashboard', async () => {
      renderNav(UserRole.STANDARD);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
    });

    it('muestra el enlace al calendario', async () => {
      renderNav(UserRole.STANDARD);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Calendario' })).toBeInTheDocument();
      });
    });

    it('muestra el enlace de solicitar ausencia', async () => {
      renderNav(UserRole.STANDARD);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Solicitar ausencia' })).toBeInTheDocument();
      });
    });

    it('no muestra enlace de auditoría', async () => {
      renderNav(UserRole.STANDARD);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de administración', async () => {
      renderNav(UserRole.STANDARD);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    });
  });

  describe('usuario VALIDATOR', () => {
    it('muestra el enlace al dashboard', async () => {
      renderNav(UserRole.VALIDATOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
    });

    it('muestra el enlace al calendario', async () => {
      renderNav(UserRole.VALIDATOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Calendario' })).toBeInTheDocument();
      });
    });

    it('muestra el enlace de solicitar ausencia', async () => {
      renderNav(UserRole.VALIDATOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Solicitar ausencia' })).toBeInTheDocument();
      });
    });

    it('no muestra enlace de auditoría', async () => {
      renderNav(UserRole.VALIDATOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de administración', async () => {
      renderNav(UserRole.VALIDATOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    });
  });

  describe('usuario AUDITOR', () => {
    it('muestra el enlace de auditoría', async () => {
      renderNav(UserRole.AUDITOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      });
    });

    it('no muestra enlace al dashboard', async () => {
      renderNav(UserRole.AUDITOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });

    it('no muestra enlace al calendario', async () => {
      renderNav(UserRole.AUDITOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Calendario' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de solicitar ausencia', async () => {
      renderNav(UserRole.AUDITOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Solicitar ausencia' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de administración', async () => {
      renderNav(UserRole.AUDITOR);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    });
  });

  describe('usuario ADMIN', () => {
    it('muestra el enlace de administración', async () => {
      renderNav(UserRole.ADMIN);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument();
      });
    });

    it('no muestra enlace al dashboard', async () => {
      renderNav(UserRole.ADMIN);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });

    it('no muestra enlace al calendario', async () => {
      renderNav(UserRole.ADMIN);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Calendario' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de solicitar ausencia', async () => {
      renderNav(UserRole.ADMIN);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Solicitar ausencia' })).not.toBeInTheDocument();
    });

    it('no muestra enlace de auditoría', async () => {
      renderNav(UserRole.ADMIN);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
    });
  });

  it('el nav tiene aria-label de navegación principal', async () => {
    renderNav(UserRole.STANDARD);
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    });
  });
});
