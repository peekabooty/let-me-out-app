import { useNavigate } from '@tanstack/react-router';

import { AbsenceFormDialog } from '../../components/absences/AbsenceFormDialog';

/**
 * AbsenceNewPage (RF-21, RF-22).
 *
 * Full-page route for creating a new absence request.
 * Reuses AbsenceFormDialog opened as a persistent overlay.
 * On success: navigates to dashboard.
 * On cancel: navigates back.
 */
export function AbsenceNewPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    void navigate({ to: '/' });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      void navigate({ to: '/' });
    }
  };

  return (
    <AbsenceFormDialog open={true} onOpenChange={handleOpenChange} onSuccess={handleSuccess} />
  );
}
