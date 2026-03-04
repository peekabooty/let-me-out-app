import { AbsenceStatus } from '@repo/types';
import type { AuditAbsence } from '../../lib/api-client';

const STATUS_LABELS: Record<AbsenceStatus, string> = {
  [AbsenceStatus.WAITING_VALIDATION]: 'Esperando validación',
  [AbsenceStatus.RECONSIDER]: 'Reconsiderar',
  [AbsenceStatus.ACCEPTED]: 'Aceptada',
  [AbsenceStatus.DISCARDED]: 'Descartada',
  [AbsenceStatus.CANCELLED]: 'Cancelada',
};

const STATUS_COLORS: Record<AbsenceStatus, string> = {
  [AbsenceStatus.WAITING_VALIDATION]: 'bg-yellow-100 text-yellow-800',
  [AbsenceStatus.RECONSIDER]: 'bg-orange-100 text-orange-800',
  [AbsenceStatus.ACCEPTED]: 'bg-green-100 text-green-800',
  [AbsenceStatus.DISCARDED]: 'bg-red-100 text-red-800',
  [AbsenceStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

interface AuditAbsencesTableProps {
  absences: AuditAbsence[];
}

export function AuditAbsencesTable({ absences }: AuditAbsencesTableProps) {
  if (absences.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No se encontraron ausencias con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Inicio</th>
            <th className="px-4 py-3">Fin</th>
            <th className="px-4 py-3">Duración</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3">Creación</th>
          </tr>
        </thead>
        <tbody>
          {absences.map((absence, index) => {
            const statusLabel = absence.status ? STATUS_LABELS[absence.status] : 'Sin estado';
            const statusColor = absence.status
              ? STATUS_COLORS[absence.status]
              : 'bg-gray-100 text-gray-800';

            return (
              <tr
                key={absence.id}
                className={
                  index % 2 === 0 ? 'bg-card text-foreground' : 'bg-muted/40 text-foreground'
                }
              >
                <td className="px-4 py-3 font-medium">{absence.userName}</td>
                <td className="px-4 py-3">{absence.absenceTypeName}</td>
                <td className="px-4 py-3">
                  {new Date(absence.startAt).toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3">{new Date(absence.endAt).toLocaleDateString('es-ES')}</td>
                <td className="px-4 py-3">{absence.duration}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {absence.teamName ?? 'Sin equipo'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(absence.createdAt).toLocaleDateString('es-ES')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
