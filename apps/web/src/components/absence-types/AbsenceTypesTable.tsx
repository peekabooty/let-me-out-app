import type { AbsenceType } from '@repo/types';
import { AbsenceUnit } from '@repo/types';
import { Ban, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';

const UNIT_LABELS: Record<AbsenceUnit, string> = {
  [AbsenceUnit.HOURS]: 'Horas',
  [AbsenceUnit.DAYS]: 'Días',
};

interface AbsenceTypesTableProps {
  absenceTypes: AbsenceType[];
  onEdit: (absenceType: AbsenceType) => void;
  onDeactivate: (absenceType: AbsenceType) => void;
  deactivatingId: string | null;
}

export function AbsenceTypesTable({
  absenceTypes,
  onEdit,
  onDeactivate,
  deactivatingId,
}: AbsenceTypesTableProps) {
  if (absenceTypes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay tipos de ausencia registrados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Máx/Año</th>
            <th className="px-4 py-3">Duración mín</th>
            <th className="px-4 py-3">Duración máx</th>
            <th className="px-4 py-3">Validación</th>
            <th className="px-4 py-3">Fechas pasadas</th>
            <th className="px-4 py-3">Días anticipación</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {absenceTypes.map((absenceType, index) => (
            <tr
              key={absenceType.id}
              className={
                index % 2 === 0 ? 'bg-card text-foreground' : 'bg-muted/40 text-foreground'
              }
            >
              <td className="px-4 py-3 font-medium">{absenceType.name}</td>
              <td className="px-4 py-3">{UNIT_LABELS[absenceType.unit]}</td>
              <td className="px-4 py-3">{absenceType.maxPerYear}</td>
              <td className="px-4 py-3">{absenceType.minDuration}</td>
              <td className="px-4 py-3">{absenceType.maxDuration}</td>
              <td className="px-4 py-3">{absenceType.requiresValidation ? 'Sí' : 'No'}</td>
              <td className="px-4 py-3">{absenceType.allowPastDates ? 'Sí' : 'No'}</td>
              <td className="px-4 py-3">
                {absenceType.minDaysInAdvance === null ? '—' : absenceType.minDaysInAdvance}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    absenceType.isActive
                      ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                      : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                  }
                >
                  {absenceType.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(absenceType)}
                    aria-label={`Editar tipo de ausencia ${absenceType.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {absenceType.isActive && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeactivate(absenceType)}
                      disabled={deactivatingId === absenceType.id}
                      aria-label={`Desactivar tipo de ausencia ${absenceType.name}`}
                      aria-busy={deactivatingId === absenceType.id}
                    >
                      <Ban
                        className={`h-4 w-4 ${deactivatingId === absenceType.id ? 'animate-pulse' : ''}`}
                        aria-hidden="true"
                      />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
