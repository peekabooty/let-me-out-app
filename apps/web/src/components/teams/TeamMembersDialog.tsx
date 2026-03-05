import { isAxiosError } from 'axios';
import { useState } from 'react';

import type { User } from '@repo/types';
import { UserRole } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUsers } from '../../hooks/use-users';
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember } from '../../hooks/use-teams';
import type { TeamMemberDto } from '../../hooks/use-teams';

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  readOnly?: boolean;
}

function isCandidateUser(user: User, members: TeamMemberDto[]): boolean {
  const isNotAuditorOrAdmin = user.role !== UserRole.AUDITOR && user.role !== UserRole.ADMIN;
  const isActive = user.isActive;
  const isNotAlreadyMember = !members.some((m) => m.userId === user.id);
  return isNotAuditorOrAdmin && isActive && isNotAlreadyMember;
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  readOnly = false,
}: TeamMembersDialogProps) {
  const { members, isLoading: membersLoading, isError: membersError } = useTeamMembers(teamId);
  const { users } = useUsers();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const candidates = users.filter((u) => isCandidateUser(u, members));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAddError(null);
    try {
      await addMember.mutateAsync({ teamId, userId: selectedUserId });
      setSelectedUserId('');
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 409
          ? 'El usuario ya es miembro de este equipo.'
          : 'Error al añadir el miembro. Inténtalo de nuevo.';
      setAddError(message);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoveError(null);
    try {
      await removeMember.mutateAsync({ teamId, userId });
    } catch {
      setRemoveError('Error al eliminar el miembro. Inténtalo de nuevo.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Miembros de {teamName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {membersLoading && (
            <p
              role="status"
              aria-live="polite"
              className="py-4 text-center text-sm text-muted-foreground"
            >
              Cargando miembros…
            </p>
          )}

          {membersError && !membersLoading && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              No se pudo cargar la lista de miembros. Inténtalo de nuevo.
            </div>
          )}

          {!membersLoading && !membersError && (
            <div>
              {members.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Este equipo no tiene miembros todavía.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Correo</th>
                        {!readOnly && <th className="px-4 py-3 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => (
                        <tr
                          key={member.userId}
                          className={
                            index % 2 === 0
                              ? 'bg-card text-foreground'
                              : 'bg-muted/40 text-foreground'
                          }
                        >
                          <td className="px-4 py-3 font-medium">{member.userName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{member.userEmail}</td>
                          {!readOnly && (
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={removeMember.isPending}
                                onClick={() => void handleRemove(member.userId)}
                              >
                                Eliminar
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {removeError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {removeError}
            </div>
          )}

          {!readOnly && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Añadir miembro</p>
              <div className="flex gap-2">
                <select
                  aria-label="Seleccionar usuario"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Seleccionar usuario…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  disabled={!selectedUserId || addMember.isPending}
                  onClick={() => void handleAdd()}
                >
                  Añadir
                </Button>
              </div>

              {addError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {addError}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
