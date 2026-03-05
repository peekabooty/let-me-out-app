import { Outlet } from '@tanstack/react-router';

import { AppNav } from '../components/layout/AppNav';
import type { SessionUser } from '../store/auth.store';

interface AuthLayoutProps {
  user: SessionUser;
}

export function AuthLayout({ user }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <header className="auth-layout__header flex items-center justify-between px-6 py-3 border-b">
        <span className="font-semibold">Let Me Out</span>
        <AppNav user={user} />
        <span className="text-sm text-muted-foreground">{user.name}</span>
      </header>
      <main className="auth-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
