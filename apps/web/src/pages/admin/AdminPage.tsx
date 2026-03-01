import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import type { User } from '@repo/types';
import { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { deactivateUser } from '../../lib/api-client';
import { userKeys } from '../../lib/query-keys/users.keys';
import { useUsers } from '../../hooks/use-users';
import { UserFormDialog } from '../../components/users/UserFormDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STANDARD]: 'Empleado',
  [UserRole.VALIDATOR]: 'Validador',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.ADMIN]: 'Administrador',
};

export function AdminPage() {
  const { data: users, isLoading, isError } = useUsers();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const handleNewUser = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.list() });
  };

  const handleDeactivate = async (user: User) => {
    setDeactivatingId(user.id);
    setDeactivateError(null);
    try {
      await deactivateUser(user.id);
      void queryClient.invalidateQueries({ queryKey: userKeys.list() });
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 404
          ? 'Usuario no encontrado.'
          : 'Error al desactivar el usuario. Inténtalo de nuevo.';
      setDeactivateError(message);
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={handleNewUser}>Nuevo usuario</Button>
      </div>

      {deactivateError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {deactivateError}
        </div>
      )}

      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted-foreground">
          Cargando usuarios…
        </p>
      )}

      {isError && (
        <p role="alert" className="text-destructive">
          Error al cargar los usuarios.
        </p>
      )}

      {!isLoading && !isError && users !== undefined && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Correo</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          Editar
                        </Button>
                        {user.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deactivatingId === user.id}
                            onClick={() => void handleDeactivate(user)}
                          >
                            {deactivatingId === user.id ? 'Desactivando…' : 'Desactivar'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
