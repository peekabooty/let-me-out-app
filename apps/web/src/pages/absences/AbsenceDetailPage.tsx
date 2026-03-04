import { useRouterState } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuthStore } from '../../store/auth.store';

function getAbsenceIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/absences\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function AbsenceDetailPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const absenceId = getAbsenceIdFromPathname(pathname);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Detalle de ausencia</h1>
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">ID:</span> {absenceId ?? 'No disponible'}
          </p>
          <p>
            <span className="font-medium text-foreground">Usuario actual:</span>{' '}
            {user?.name ?? 'No autenticado'}
          </p>
          <p>Vista de detalle en modo solo lectura.</p>
        </CardContent>
      </Card>
    </div>
  );
}
