import type { User } from '@repo/types';
import { UserRole } from '@repo/types';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STANDARD]: 'Empleado',
  [UserRole.VALIDATOR]: 'Validador',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.ADMIN]: 'Administrador',
};

interface UserTableProps {
  users: User[];
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No hay usuarios registrados.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Correo</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr
              key={user.id}
              className={
                index % 2 === 0 ? 'bg-card text-foreground' : 'bg-muted/40 text-foreground'
              }
            >
              <td className="px-4 py-3 font-medium">{user.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    user.isActive
                      ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                      : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                  }
                >
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
