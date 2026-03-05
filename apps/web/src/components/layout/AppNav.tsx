import { Link } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import type { SessionUser } from '../../store/auth.store';

interface AppNavProps {
  user: SessionUser;
}

interface NavLink {
  to: string;
  label: string;
}

function getNavLinks(role: UserRole): NavLink[] {
  switch (role) {
    case UserRole.STANDARD:
    case UserRole.VALIDATOR: {
      return [
        { to: '/', label: 'Dashboard' },
        { to: '/calendar', label: 'Calendario' },
        { to: '/absences/new', label: 'Solicitar ausencia' },
      ];
    }
    case UserRole.AUDITOR: {
      return [{ to: '/audit', label: 'Auditoría' }];
    }
    case UserRole.ADMIN: {
      return [{ to: '/admin', label: 'Administración' }];
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
              className="text-sm font-medium hover:underline"
              activeProps={{ className: 'text-sm font-medium underline' }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
