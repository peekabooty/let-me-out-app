import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PendingValidation } from '../../lib/api-client';

interface PendingValidationsListProps {
  validations: PendingValidation[];
}

/**
 * PendingValidationsList component displays absences pending validation.
 *
 * Only shown to validators.
 * Each item shows:
 * - User name
 * - Absence type name
 * - Start and end dates
 * - Duration
 * - Creation date
 *
 * Clicking on a validation navigates to the absence detail page.
 *
 * Part of RF-55 (Dashboard view).
 */
export function PendingValidationsList({ validations }: PendingValidationsListProps) {
  const navigate = useNavigate();

  const handleValidationClick = (absenceId: string) => {
    void navigate({ to: `/absences/${absenceId}` });
  };

  if (validations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validaciones pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tienes validaciones pendientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validaciones pendientes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {validations.map((validation) => {
            const startDate = format(new Date(validation.startAt), 'dd MMM yyyy', { locale: es });
            const endDate = format(new Date(validation.endAt), 'dd MMM yyyy', { locale: es });
            const createdDate = format(new Date(validation.createdAt), 'dd MMM yyyy', {
              locale: es,
            });
            const unitLabel =
              validation.duration === 1
                ? validation.duration % 1 === 0
                  ? 'día'
                  : 'hora'
                : validation.duration % 1 === 0
                  ? 'días'
                  : 'horas';

            return (
              <li
                key={validation.id}
                className="flex flex-col space-y-1 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleValidationClick(validation.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleValidationClick(validation.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{validation.userName}</span>
                  <span className="text-xs text-muted-foreground">Solicitado: {createdDate}</span>
                </div>
                <div className="text-sm text-muted-foreground">{validation.absenceTypeName}</div>
                <div className="text-xs text-muted-foreground">
                  {startDate} - {endDate}
                </div>
                <div className="text-xs text-muted-foreground">
                  Duración: {validation.duration} {unitLabel}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
