import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { logout } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';

interface LogoutButtonProps {
  collapsed?: boolean;
}

export function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    useAuthStore.getState().clearSession();
    await navigate({ to: '/login' });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void handleLogout()}
      className={collapsed ? 'w-full justify-center px-2' : 'w-full justify-start'}
      title={collapsed ? 'Cerrar sesión' : undefined}
      aria-label="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {!collapsed && <span>Cerrar sesión</span>}
    </Button>
  );
}
