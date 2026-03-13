import { useState } from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuditAbsences } from '../../hooks/use-audit';
import { useTeams } from '../../hooks/use-teams';
import { AuditFilters } from '../../components/audit/AuditFilters';
import { AuditAbsencesTable } from '../../components/audit/AuditAbsencesTable';
import { getAuditExportCsvUrl } from '../../lib/api-client';

export function AuditPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();

  const filters = {
    ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { absences, isLoading, isError } = useAuditAbsences(filters);
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeams();

  const handleExportCsv = () => {
    const url = getAuditExportCsvUrl(filters);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoría de Ausencias</h1>
          <p className="text-sm text-muted-foreground">
            Vista de solo lectura de todas las ausencias del sistema.
          </p>
        </div>
        <Button onClick={handleExportCsv} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Exportar CSV
        </Button>
      </div>

      {teamsError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          No se pudo cargar la lista de equipos. Inténtalo de nuevo.
        </div>
      )}

      {!teamsLoading && !teamsError && (
        <AuditFilters
          teams={teams}
          selectedTeamId={selectedTeamId}
          selectedStatus={selectedStatus}
          startDate={startDate}
          endDate={endDate}
          onTeamChange={setSelectedTeamId}
          onStatusChange={setSelectedStatus}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      )}

      <div className="space-y-4">
        {isLoading && (
          <p
            role="status"
            aria-live="polite"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            Cargando ausencias…
          </p>
        )}

        {isError && !isLoading && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            No se pudo cargar la lista de ausencias. Inténtalo de nuevo.
          </div>
        )}

        {!isLoading && !isError && <AuditAbsencesTable absences={absences} />}
      </div>
    </div>
  );
}
