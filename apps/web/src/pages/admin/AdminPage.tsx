import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from '@tanstack/react-router';

import type { AbsenceType, Team } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deactivateAbsenceType } from '../../lib/api-client';
import { absenceTypesKeys } from '../../lib/query-keys/absence-types.keys';
import { useAbsenceTypes } from '../../hooks/use-absence-types';
import { useTeams, useDeleteTeam } from '../../hooks/use-teams';
import { AdminUsersSection } from '../../components/admin/AdminUsersSection';
import { AbsenceTypeFormDialog } from '../../components/absence-types/AbsenceTypeFormDialog';
import { AbsenceTypesTable } from '../../components/absence-types/AbsenceTypesTable';
import { TeamFormDialog } from '../../components/teams/TeamFormDialog';
import { TeamMembersDialog } from '../../components/teams/TeamMembersDialog';
import { TeamsTable } from '../../components/teams/TeamsTable';
import { teamsKeys } from '../../lib/query-keys/teams.keys';

export function AdminPage() {
  const {
    absenceTypes,
    isLoading: absenceTypesLoading,
    isError: absenceTypesError,
  } = useAbsenceTypes();
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeams();
  const deleteTeamMutation = useDeleteTeam();
  const queryClient = useQueryClient();

  const [absenceTypeDialogOpen, setAbsenceTypeDialogOpen] = useState(false);
  const [editingAbsenceType, setEditingAbsenceType] = useState<AbsenceType | undefined>();
  const [deactivatingAbsenceTypeId, setDeactivatingAbsenceTypeId] = useState<string | null>(null);
  const [absenceTypeDeactivateError, setAbsenceTypeDeactivateError] = useState<string | null>(null);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);
  const [teamDeleteError, setTeamDeleteError] = useState<string | null>(null);

  const handleDeleteTeam = async (team: Team) => {
    setTeamDeleteError(null);
    try {
      await deleteTeamMutation.mutateAsync(team.id);
    } catch {
      setTeamDeleteError('Error al eliminar el equipo. Inténtalo de nuevo.');
    }
  };

  const handleManageMembers = (team: Team) => {
    setManagingMembersTeam(team);
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
    void queryClient.invalidateQueries({ queryKey: absenceTypesKeys.all });
  };

  const handleTeamDialogSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: teamsKeys.list() });
  };

  const handleDeactivateAbsenceType = async (absenceType: AbsenceType) => {
    setDeactivatingAbsenceTypeId(absenceType.id);
    setAbsenceTypeDeactivateError(null);
    try {
      await deactivateAbsenceType(absenceType.id);
      void queryClient.invalidateQueries({ queryKey: absenceTypesKeys.all });
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
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          aria-label="Volver al inicio"
        >
          ← Volver al inicio
        </Link>
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
          <AdminUsersSection />
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

            {teamDeleteError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {teamDeleteError}
              </div>
            )}

            {!teamsLoading && !teamsError && (
              <TeamsTable
                teams={teams}
                onManageMembers={handleManageMembers}
                onDelete={(team) => void handleDeleteTeam(team)}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

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

      {managingMembersTeam && (
        <TeamMembersDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setManagingMembersTeam(null);
          }}
          teamId={managingMembersTeam.id}
          teamName={managingMembersTeam.name}
        />
      )}
    </div>
  );
}
