import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { UpcomingAbsence } from '../../lib/api-client';

interface UpcomingAbsencesListProps {
  absences: UpcomingAbsence[];
}

/**
 * UpcomingAbsencesList component displays a list of upcoming absences.
 *
 * Shows up to 10 upcoming absences ordered by startAt ASC.
 * Each item shows:
 * - Absence type name
 * - Start and end dates
 * - Duration
 * - Status (if applicable)
 *
 * Clicking on an absence navigates to its detail page.
 *
 * Part of RF-55 (Dashboard view).
 */
export function UpcomingAbsencesList({ absences }: UpcomingAbsencesListProps) {
  const navigate = useNavigate();

  const handleAbsenceClick = (absenceId: string) => {
    void navigate({ to: `/absences/${absenceId}` });
  };

  if (absences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Próximas ausencias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tienes ausencias próximas programadas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas ausencias</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {absences.map((absence) => {
            const startDate = format(new Date(absence.startAt), 'dd MMM yyyy', { locale: es });
            const endDate = format(new Date(absence.endAt), 'dd MMM yyyy', { locale: es });
            const unitLabel =
              absence.duration === 1
                ? absence.duration % 1 === 0
                  ? 'día'
                  : 'hora'
                : absence.duration % 1 === 0
                  ? 'días'
                  : 'horas';

            return (
              <li
                key={absence.id}
                className="flex flex-col space-y-1 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAbsenceClick(absence.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleAbsenceClick(absence.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{absence.absenceTypeName}</span>
                  {absence.status && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {absence.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {startDate} - {endDate}
                </div>
                <div className="text-xs text-muted-foreground">
                  Duración: {absence.duration} {unitLabel}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
