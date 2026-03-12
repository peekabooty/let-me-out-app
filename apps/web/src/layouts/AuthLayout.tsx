import { Outlet } from '@tanstack/react-router';

import { AppSidebar } from '../components/layout/AppSidebar';
import type { SessionUser } from '../store/auth.store';

interface AuthLayoutProps {
  user: SessionUser;
}

export function AuthLayout({ user }: AuthLayoutProps) {
  return (
    <div className="auth-layout flex h-screen flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:underline"
      >
        Saltar al contenido principal
      </a>
      <AppSidebar user={user} />
      <main id="main-content" className="auth-layout__content flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
