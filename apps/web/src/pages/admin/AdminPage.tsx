import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import type { User, AbsenceType } from '@repo/types';
import { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deactivateUser, deactivateAbsenceType } from '../../lib/api-client';
import { usersKeys } from '../../lib/query-keys/users.keys';
import { absenceTypesKeys } from '../../lib/query-keys/absence-types.keys';
import { useUsers } from '../../hooks/use-users';
import { useAbsenceTypes } from '../../hooks/use-absence-types';
import { useTeams } from '../../hooks/use-teams';
import { UserFormDialog } from '../../components/users/UserFormDialog';
import { AbsenceTypeFormDialog } from '../../components/absence-types/AbsenceTypeFormDialog';
import { AbsenceTypesTable } from '../../components/absence-types/AbsenceTypesTable';
import { TeamFormDialog } from '../../components/teams/TeamFormDialog';
import { TeamsTable } from '../../components/teams/TeamsTable';
import { teamsKeys } from '../../lib/query-keys/teams.keys';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STANDARD]: 'Empleado',
  [UserRole.VALIDATOR]: 'Validador',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.ADMIN]: 'Administrador',
};

export function AdminPage() {
  const { users, isLoading: usersLoading, isError: usersError } = useUsers();
  const {
    absenceTypes,
    isLoading: absenceTypesLoading,
    isError: absenceTypesError,
  } = useAbsenceTypes();
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeams();
  const queryClient = useQueryClient();

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [userDeactivateError, setUserDeactivateError] = useState<string | null>(null);

  const [absenceTypeDialogOpen, setAbsenceTypeDialogOpen] = useState(false);
  const [editingAbsenceType, setEditingAbsenceType] = useState<AbsenceType | undefined>();
  const [deactivatingAbsenceTypeId, setDeactivatingAbsenceTypeId] = useState<string | null>(null);
  const [absenceTypeDeactivateError, setAbsenceTypeDeactivateError] = useState<string | null>(null);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  const handleNewUser = () => {
    setEditingUser(undefined);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  const handleUserDialogSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: usersKeys.list() });
  };

  const handleDeactivateUser = async (user: User) => {
    setDeactivatingUserId(user.id);
    setUserDeactivateError(null);
    try {
      await deactivateUser(user.id);
      void queryClient.invalidateQueries({ queryKey: usersKeys.list() });
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

  const handleNewAbsenceType = () => {
    setEditingAbsenceType(undefined);
    setAbsenceTypeDialogOpen(true);
  };

  const handleEditAbsenceType = (absenceType: AbsenceType) => {
    setEditingAbsenceType(absenceType);
    setAbsenceTypeDialogOpen(true);
  };

  const handleAbsenceTypeDialogSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: absenceTypesKeys.list() });
  };

  const handleTeamDialogSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: teamsKeys.list() });
  };

  const handleDeactivateAbsenceType = async (absenceType: AbsenceType) => {
    setDeactivatingAbsenceTypeId(absenceType.id);
    setAbsenceTypeDeactivateError(null);
    try {
      await deactivateAbsenceType(absenceType.id);
      void queryClient.invalidateQueries({ queryKey: absenceTypesKeys.list() });
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 404
          ? 'Tipo de ausencia no encontrado.'
          : 'Error al desactivar el tipo de ausencia. Inténtalo de nuevo.';
      setAbsenceTypeDeactivateError(message);
    } finally {
      setDeactivatingAbsenceTypeId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de usuarios y tipos de ausencia del sistema.
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="absence-types">Tipos de Ausencia</TabsTrigger>
          <TabsTrigger value="teams">Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                Editar
                              </Button>
                              {user.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={deactivatingUserId === user.id}
                                  onClick={() => void handleDeactivateUser(user)}
                                >
                                  {deactivatingUserId === user.id ? 'Desactivando…' : 'Desactivar'}
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
        </TabsContent>

        <TabsContent value="absence-types">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Tipos de Ausencia</h2>
                <p className="text-sm text-muted-foreground">
                  Gestión de tipos de ausencia del sistema.
                </p>
              </div>
              <Button onClick={handleNewAbsenceType}>Nuevo tipo</Button>
            </div>

            {absenceTypeDeactivateError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {absenceTypeDeactivateError}
              </div>
            )}

            {absenceTypesLoading && (
              <p
                role="status"
                aria-live="polite"
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Cargando tipos de ausencia…
              </p>
            )}

            {absenceTypesError && !absenceTypesLoading && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                No se pudo cargar la lista de tipos de ausencia. Inténtalo de nuevo.
              </div>
            )}

            {!absenceTypesLoading && !absenceTypesError && (
              <AbsenceTypesTable
                absenceTypes={absenceTypes}
                onEdit={handleEditAbsenceType}
                onDeactivate={handleDeactivateAbsenceType}
                deactivatingId={deactivatingAbsenceTypeId}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Equipos</h2>
                <p className="text-sm text-muted-foreground">
                  Gestión de equipos y colores para visualización en calendario.
                </p>
              </div>
              <Button onClick={() => setTeamDialogOpen(true)}>Nuevo equipo</Button>
            </div>

            {teamsLoading && (
              <p
                role="status"
                aria-live="polite"
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Cargando equipos…
              </p>
            )}

            {teamsError && !teamsLoading && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                No se pudo cargar la lista de equipos. Inténtalo de nuevo.
              </div>
            )}

            {!teamsLoading && !teamsError && <TeamsTable teams={teams} />}
          </div>
        </TabsContent>
      </Tabs>

      <UserFormDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={editingUser}
        onSuccess={handleUserDialogSuccess}
      />

      <AbsenceTypeFormDialog
        open={absenceTypeDialogOpen}
        onOpenChange={setAbsenceTypeDialogOpen}
        absenceType={editingAbsenceType}
        onSuccess={handleAbsenceTypeDialogSuccess}
      />

      <TeamFormDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        onSuccess={handleTeamDialogSuccess}
      />
    </div>
  );
}
