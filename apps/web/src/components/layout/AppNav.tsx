import { Link } from '@tanstack/react-router';
import { UserRole } from '@repo/types';
import { CalendarDays, LayoutDashboard, ShieldCheck, type LucideIcon } from 'lucide-react';

import type { SessionUser } from '../../store/auth.store';

interface AppNavProps {
  user: SessionUser;
}

interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function getNavLinks(role: UserRole): NavLink[] {
  switch (role) {
    case UserRole.STANDARD:
    case UserRole.VALIDATOR: {
      return [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/calendar', label: 'Calendario', icon: CalendarDays },
      ];
    }
    case UserRole.AUDITOR: {
      return [{ to: '/audit', label: 'Auditoría', icon: ShieldCheck }];
    }
    case UserRole.ADMIN: {
      return [{ to: '/admin', label: 'Administración', icon: ShieldCheck }];
    }
    default: {
      return [];
    }
  }
}

export function AppNav({ user }: AppNavProps) {
  const links = getNavLinks(user.role);

  return (
    <nav aria-label="Navegación principal">
      <ul className="flex gap-4 list-none m-0 p-0">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              activeProps={{
                className: 'inline-flex items-center gap-2 text-sm font-medium underline',
              }}
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
