import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { AbsenceTypeBalance } from '../../lib/api-client';

interface BalanceCardProps {
  balance: AbsenceTypeBalance;
}

/**
 * BalanceCard component displays the balance for a specific absence type.
 *
 * Shows:
 * - Absence type name
 * - Maximum allowed per year
 * - Consumed amount
 * - Remaining amount
 * - Unit (hours/days)
 *
 * Part of RF-55 (Dashboard view).
 */
export function BalanceCard({ balance }: BalanceCardProps) {
  const unitLabel = balance.unit === 'hours' ? 'horas' : 'días';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{balance.absenceTypeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Máximo anual:</span>
          <span className="font-medium">
            {balance.maxPerYear} {unitLabel}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Consumido:</span>
          <span className="font-medium">
            {balance.consumed} {unitLabel}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Restante:</span>
          <span className="font-semibold text-primary">
            {balance.remaining} {unitLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
