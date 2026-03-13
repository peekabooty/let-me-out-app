import { Link } from '@tanstack/react-router';
import { Menu, Palette, User } from 'lucide-react';
import { useState } from 'react';

import { LogoutButton } from './LogoutButton';
import { getNavLinks } from './AppNav';
import { ThemeSelector } from '../theme/ThemeSelector';
import { AvatarPicker } from '../profile/AvatarPicker';
import type { SessionUser } from '../../store/auth.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

interface AppSidebarProps {
  user: SessionUser;
}

function getInitialCollapsedState(): boolean {
  if (globalThis.window === undefined) {
    return false;
  }

  return globalThis.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AppSidebar({ user }: AppSidebarProps) {
  const links = getNavLinks(user.role);
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsedState);

  const handleToggle = () => {
    setCollapsed((previous) => {
      const next = !previous;
      globalThis.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      aria-label="Menú principal"
      className={`flex h-screen shrink-0 flex-col border-r bg-background transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold" aria-hidden="true">
            Let Me Out
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleToggle}
          aria-controls="sidebar-nav"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className="h-9 w-9"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <nav id="sidebar-nav" className="px-2 py-3" aria-label="Navegación principal">
        <ul className="m-0 list-none space-y-1 p-0">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                title={collapsed ? link.label : undefined}
                aria-label={link.label}
                className="inline-flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                activeProps={{
                  className:
                    'inline-flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-accent text-accent-foreground',
                }}
              >
                <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto border-t px-3 py-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              title={collapsed ? 'Tema' : undefined}
              aria-label="Tema"
              className={`mb-2 h-auto w-full py-2 text-sm ${collapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3'}`}
            >
              <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Tema</span>}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar tema</DialogTitle>
              <DialogDescription>
                Elige el tema visual para personalizar la interfaz de la aplicación.
              </DialogDescription>
            </DialogHeader>
            <ThemeSelector />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={`mb-2 h-auto w-full text-sm text-muted-foreground ${collapsed ? 'justify-center px-2 py-2' : 'justify-start gap-2 px-2 py-2'}`}
              aria-label="Editar avatar"
            >
              <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium">
                    {getUserInitials(user.name)}
                  </span>
                )}
              </span>
              {!collapsed && <span aria-label={`Usuario: ${user.name}`}>{user.name}</span>}
              {collapsed && <User className="sr-only" aria-hidden="true" />}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actualizar avatar</DialogTitle>
              <DialogDescription>Selecciona una imagen para tu perfil.</DialogDescription>
            </DialogHeader>
            <AvatarPicker />
          </DialogContent>
        </Dialog>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
