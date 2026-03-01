import { Outlet } from '@tanstack/react-router';

import type { SessionUser } from '../store/auth.store';

interface AuthLayoutProps {
  user: SessionUser;
}

export function AuthLayout({ user }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <header className="auth-layout__header">
        <span>Let Me Out</span>
        <span>{user.name}</span>
      </header>
      <main className="auth-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
