import { Outlet } from '@tanstack/react-router';

export function PublicLayout() {
  return (
    <div className="public-layout">
      <Outlet />
    </div>
  );
}
