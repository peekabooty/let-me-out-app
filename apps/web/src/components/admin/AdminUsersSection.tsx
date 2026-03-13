import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Pencil, RotateCw, Trash2, UserX } from 'lucide-react';

import type { User } from '@repo/types';
import { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDeactivateUser,
  useDeleteUser,
  useResendActivation,
  useUsers,
} from '../../hooks/use-users';
import { usersKeys } from '../../lib/query-keys/users.keys';
import { UserFormDialog } from '../users/UserFormDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STANDARD]: 'Empleado',
  [UserRole.VALIDATOR]: 'Validador',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.ADMIN]: 'Administrador',
};

export function AdminUsersSection() {
  const { users, isLoading: usersLoading, isError: usersError } = useUsers();
  const deactivateUserMutation = useDeactivateUser();
  const deleteUserMutation = useDeleteUser();
  const resendActivationMutation = useResendActivation();
  const queryClient = useQueryClient();

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userDeactivateError, setUserDeactivateError] = useState<string | null>(null);
  const [userResendError, setUserResendError] = useState<string | null>(null);
  const [userDeleteError, setUserDeleteError] = useState<string | null>(null);

  const handleNewUser = () => {
    setEditingUser(undefined);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  const handleDeactivateUser = async (user: User) => {
    setDeactivatingUserId(user.id);
    setUserDeactivateError(null);
    try {
      await deactivateUserMutation.mutateAsync(user.id);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 404
          ? 'Usuario no encontrado.'
          : 'Error al desactivar el usuario. Inténtalo de nuevo.';
      setUserDeactivateError(message);
    } finally {
      setDeactivatingUserId(null);
    }
  };

  const handleResendActivation = async (user: User) => {
    setResendingUserId(user.id);
    setUserResendError(null);
    try {
      await resendActivationMutation.mutateAsync(user.id);
    } catch (error) {
      let message = 'Error al reenviar invitación. Inténtalo de nuevo.';
      if (isAxiosError(error) && error.response?.status === 404) {
        message = 'Usuario no encontrado.';
      } else if (isAxiosError(error) && error.response?.status === 400) {
        message = 'No se puede reenviar invitación a un usuario ya activo.';
      }
      setUserResendError(message);
    } finally {
      setResendingUserId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    setDeletingUserId(user.id);
    setUserDeleteError(null);
    try {
      await deleteUserMutation.mutateAsync(user.id);
      setUserToDelete(null);
    } catch (error) {
      let message = 'Error al eliminar el usuario. Inténtalo de nuevo.';
      if (isAxiosError(error) && error.response?.status === 404) {
        message = 'Usuario no encontrado.';
      } else if (isAxiosError(error) && error.response?.status === 409) {
        message = 'No se puede eliminar el usuario porque tiene ausencias activas.';
      }
      setUserDeleteError(message);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Usuarios</h2>
            <p className="text-sm text-muted-foreground">Gestión de usuarios del sistema.</p>
          </div>
          <Button onClick={handleNewUser}>Nuevo usuario</Button>
        </div>

        {userDeactivateError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {userDeactivateError}
          </div>
        )}

        {userResendError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {userResendError}
          </div>
        )}

        {userDeleteError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {userDeleteError}
          </div>
        )}

        {usersLoading && (
          <p
            role="status"
            aria-live="polite"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            Cargando usuarios…
          </p>
        )}

        {usersError && !usersLoading && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            No se pudo cargar la lista de usuarios. Inténtalo de nuevo.
          </div>
        )}

        {!usersLoading && !usersError && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
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
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            aria-label={`Editar usuario ${user.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deactivatingUserId === user.id}
                              onClick={() => void handleDeactivateUser(user)}
                              aria-label={`Desactivar usuario ${user.name}`}
                              aria-busy={deactivatingUserId === user.id}
                            >
                              <UserX
                                className={`h-4 w-4 ${deactivatingUserId === user.id ? 'animate-pulse' : ''}`}
                                aria-hidden="true"
                              />
                            </Button>
                          )}
                          {!user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resendingUserId === user.id}
                              onClick={() => void handleResendActivation(user)}
                              aria-label={`Reenviar invitación a ${user.name}`}
                              aria-busy={resendingUserId === user.id}
                            >
                              <RotateCw
                                className={`h-4 w-4 ${resendingUserId === user.id ? 'animate-spin' : ''}`}
                                aria-hidden="true"
                              />
                            </Button>
                          )}
                          {!user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              aria-label={`Eliminar usuario ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
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
      </div>

      <UserFormDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={editingUser}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: usersKeys.list() });
        }}
      />

      <Dialog
        open={userToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar permanentemente al usuario{' '}
              <span className="font-semibold">{userToDelete?.name}</span>? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  void handleDeleteUser(userToDelete);
                }
              }}
              disabled={deletingUserId === userToDelete?.id}
            >
              {deletingUserId === userToDelete?.id ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
