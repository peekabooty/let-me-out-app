import { useRouterState } from '@tanstack/react-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { AbsenceStatus, UserRole } from '@repo/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AbsenceCancelActions } from '../../components/absences/AbsenceCancelActions';
import { AbsenceReconsiderActions } from '../../components/absences/AbsenceReconsiderActions';
import { AbsenceValidationActions } from '../../components/absences/AbsenceValidationActions';
import { ObservationsList } from '../../components/absences/ObservationsList';
import { useAbsence } from '../../hooks/use-absences';
import { useAuthStore } from '../../store/auth.store';

const STATUS_LABELS: Record<string, string> = {
  [AbsenceStatus.WAITING_VALIDATION]: 'Pendiente de validación',
  [AbsenceStatus.RECONSIDER]: 'Replantear',
  [AbsenceStatus.ACCEPTED]: 'Aceptada',
  [AbsenceStatus.DISCARDED]: 'Descartada',
  [AbsenceStatus.CANCELLED]: 'Cancelada',
};

function getAbsenceIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/absences\/([^/]+)$/);
  return match?.[1] ?? null;
}

function formatDate(dateString: string): string {
  return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * AbsenceDetailPage (RF-29, RF-30, RF-31, RF-35, RF-37, RF-51, RF-54, RF-59, RF-63).
 *
 * Shows absence data, role-based action buttons, observations, and status history.
 */
export function AbsenceDetailPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const absenceId = getAbsenceIdFromPathname(pathname);
  const user = useAuthStore((state) => state.user);

  const { data: absence, isLoading, error } = useAbsence(absenceId ?? '');

  if (!absenceId) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-sm text-destructive">ID de ausencia no disponible.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Cargando ausencia…
        </p>
      </div>
    );
  }

  if (error || !absence) {
    return (
      <div className="container mx-auto py-8">
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          No se pudo cargar la ausencia. Inténtalo de nuevo.
        </div>
      </div>
    );
  }

  const statusLabel = absence.status ? (STATUS_LABELS[absence.status] ?? absence.status) : '—';
  const isAuditor = user?.role === UserRole.AUDITOR;

  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-bold">Detalle de ausencia</h1>

      {/* Absence summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Tipo:</span>{' '}
            <span className="text-muted-foreground">{absence.absenceTypeId}</span>
          </p>
          <p>
            <span className="font-medium">Inicio:</span>{' '}
            <span className="text-muted-foreground">{formatDate(absence.startAt)}</span>
          </p>
          <p>
            <span className="font-medium">Fin:</span>{' '}
            <span className="text-muted-foreground">{formatDate(absence.endAt)}</span>
          </p>
          <p>
            <span className="font-medium">Duración:</span>{' '}
            <span className="text-muted-foreground">{absence.duration}</span>
          </p>
          <p>
            <span className="font-medium">Estado:</span>{' '}
            <span className="text-muted-foreground">{statusLabel}</span>
          </p>
          <p>
            <span className="font-medium">Creada:</span>{' '}
            <span className="text-muted-foreground">{formatDate(absence.createdAt)}</span>
          </p>
        </CardContent>
      </Card>

      {/* Role-based action buttons — not shown to auditors (read-only role) */}
      {!isAuditor && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <AbsenceValidationActions absence={absence} validatorIds={absence.validatorIds} />
            <AbsenceReconsiderActions absence={absence} />
            <AbsenceCancelActions absence={absence} />
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      <Card>
        <CardContent className="pt-6">
          <ObservationsList absenceId={absenceId} />
        </CardContent>
      </Card>
    </div>
  );
}
