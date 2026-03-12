import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { logout } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';

export function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    useAuthStore.getState().clearSession();
    await navigate({ to: '/login' });
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
      Cerrar sesión
    </Button>
  );
}
