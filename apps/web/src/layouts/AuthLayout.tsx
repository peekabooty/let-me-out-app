import { Outlet } from '@tanstack/react-router';

import { AppNav } from '../components/layout/AppNav';
import { LogoutButton } from '../components/layout/LogoutButton';
import type { SessionUser } from '../store/auth.store';

interface AuthLayoutProps {
  user: SessionUser;
}

export function AuthLayout({ user }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:underline"
      >
        Saltar al contenido principal
      </a>
      <header className="auth-layout__header flex items-center justify-between px-6 py-3 border-b">
        <span className="font-semibold" aria-hidden="true">
          Let Me Out
        </span>
        <AppNav user={user} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground" aria-label={`Usuario: ${user.name}`}>
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main id="main-content" className="auth-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
