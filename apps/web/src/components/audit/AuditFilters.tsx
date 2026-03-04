import { AbsenceStatus } from '@repo/types';
import type { Team } from '@repo/types';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

const STATUS_LABELS: Record<AbsenceStatus, string> = {
  [AbsenceStatus.WAITING_VALIDATION]: 'Esperando validación',
  [AbsenceStatus.RECONSIDER]: 'Reconsiderar',
  [AbsenceStatus.ACCEPTED]: 'Aceptada',
  [AbsenceStatus.DISCARDED]: 'Descartada',
  [AbsenceStatus.CANCELLED]: 'Cancelada',
};

interface AuditFiltersProps {
  teams: Team[];
  selectedTeamId: string | undefined;
  selectedStatus: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  onTeamChange: (teamId: string | undefined) => void;
  onStatusChange: (status: string | undefined) => void;
  onStartDateChange: (date: string | undefined) => void;
  onEndDateChange: (date: string | undefined) => void;
}

export function AuditFilters({
  teams,
  selectedTeamId,
  selectedStatus,
  startDate,
  endDate,
  onTeamChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
}: AuditFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="team-filter">Equipo</Label>
        <Select
          value={selectedTeamId ?? 'all'}
          onValueChange={(value) => onTeamChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger id="team-filter">
            <SelectValue placeholder="Todos los equipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status-filter">Estado</Label>
        <Select
          value={selectedStatus ?? 'all'}
          onValueChange={(value) => onStatusChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger id="status-filter">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start-date-filter">Fecha inicio</Label>
        <Input
          id="start-date-filter"
          type="date"
          value={startDate ?? ''}
          onChange={(e) => onStartDateChange(e.target.value || undefined)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date-filter">Fecha fin</Label>
        <Input
          id="end-date-filter"
          type="date"
          value={endDate ?? ''}
          onChange={(e) => onEndDateChange(e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
