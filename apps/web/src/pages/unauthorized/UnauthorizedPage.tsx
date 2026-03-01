import { Link } from '@tanstack/react-router';

export function UnauthorizedPage() {
  return (
    <main className="unauthorized-page">
      <h1>Acceso no permitido</h1>
      <p>No tienes permisos para acceder a esta página.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  );
}
