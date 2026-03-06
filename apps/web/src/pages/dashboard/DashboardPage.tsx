import { Link } from '@tanstack/react-router';
import { UserRole } from '@repo/types';

import { useDashboard } from '../../hooks/use-dashboard';
import { useAuthStore } from '../../store/auth.store';
import { BalanceCard } from '../../components/dashboard/BalanceCard';
import { UpcomingAbsencesList } from '../../components/dashboard/UpcomingAbsencesList';
import { PendingValidationsList } from '../../components/dashboard/PendingValidationsList';
import { getOwnExportCsvUrl } from '../../lib/api-client';

/**
 * DashboardPage component (RF-55).
 *
 * Displays:
 * - Balance per absence type (maxPerYear, consumed, remaining) for current year
 * - Upcoming absences (max 10, ordered by startAt ASC)
 * - Pending validations section (only for validators)
 *
 * Available to standard and validator users.
 */
export function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const user = useAuthStore((state) => state.user);

  const isValidator = user?.role === UserRole.VALIDATOR;
  const canRequestAbsence = user?.role === UserRole.STANDARD || user?.role === UserRole.VALIDATOR;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <p role="status" aria-live="polite" className="text-muted-foreground">
          Cargando datos...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <p role="alert" className="text-destructive">
          Error al cargar los datos del dashboard. Por favor, intenta de nuevo.
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {canRequestAbsence && (
            <a
              href={getOwnExportCsvUrl()}
              download
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Exportar CSV
            </a>
          )}
          {canRequestAbsence && (
            <Link
              to="/absences/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Solicitar ausencia
            </Link>
          )}
        </div>
      </div>

      {/* Balance section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Balance de ausencias</h2>
        {data.balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay tipos de ausencia configurados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.balances.map((balance) => (
              <BalanceCard key={balance.absenceTypeId} balance={balance} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming absences section */}
      <section>
        <UpcomingAbsencesList absences={data.upcomingAbsences} />
      </section>

      {/* Pending validations section (only for validators) */}
      {isValidator && data.pendingValidations.length > 0 && (
        <section>
          <PendingValidationsList validations={data.pendingValidations} />
        </section>
      )}
    </div>
  );
}
