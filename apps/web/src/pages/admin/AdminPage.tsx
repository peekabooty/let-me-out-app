import { UserTable } from '@/components/users/UserTable';
import { useUsers } from '@/hooks/use-users';

export function AdminPage() {
  const { users, isLoading, isError } = useUsers();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios del sistema.</p>
        </div>
      </div>

      {isLoading && (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Cargando usuarios…
        </p>
      )}

      {isError && !isLoading && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          No se pudo cargar la lista de usuarios. Inténtalo de nuevo.
        </div>
      )}

      {!isLoading && !isError && <UserTable users={users} />}
    </div>
  );
}
