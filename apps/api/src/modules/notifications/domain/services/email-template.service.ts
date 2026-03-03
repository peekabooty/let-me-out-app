import type { AbsenceStatus } from '@repo/types';

/**
 * Service for generating email templates for notifications.
 */
export class EmailTemplateService {
  /**
   * Generates HTML email for validator assignment notification.
   *
   * @param {string} validatorName - Name of the validator
   * @param {string} employeeName - Name of the employee who created the absence
   * @param {string} startAt - Start date (ISO format)
   * @param {string} endAt - End date (ISO format)
   * @param {number} duration - Duration in days or hours
   * @returns {string} HTML email body
   */
  generateValidatorAssignmentEmail(
    validatorName: string,
    employeeName: string,
    startAt: string,
    endAt: string,
    duration: number
  ): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva ausencia asignada</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Nueva ausencia asignada para validación</h2>
    <p>Hola ${validatorName},</p>
    <p>Se te ha asignado una nueva ausencia para validar:</p>
    <div style="background-color: #fff; padding: 15px; border-radius: 4px; margin: 15px 0;">
      <p><strong>Empleado:</strong> ${employeeName}</p>
      <p><strong>Inicio:</strong> ${startAt}</p>
      <p><strong>Fin:</strong> ${endAt}</p>
      <p><strong>Duración:</strong> ${duration} días</p>
    </div>
    <p>Por favor, revisa y valida esta ausencia en la aplicación.</p>
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Este es un mensaje automático. Por favor, no respondas a este correo.
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generates HTML email for absence status change notification.
   *
   * @param {string} employeeName - Name of the employee
   * @param {AbsenceStatus} newStatus - New absence status
   * @param {string} startAt - Start date (ISO format)
   * @param {string} endAt - End date (ISO format)
   * @returns {string} HTML email body
   */
  generateStatusChangeEmail(
    employeeName: string,
    newStatus: AbsenceStatus,
    startAt: string,
    endAt: string
  ): string {
    const statusLabels: Record<AbsenceStatus, string> = {
      waiting_validation: 'Pendiente de validación',
      accepted: 'Aprobada',
      reconsider: 'En reconsideración',
      cancelled: 'Cancelada',
      discarded: 'Descartada',
    };

    const statusLabel = statusLabels[newStatus] || newStatus;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cambio de estado de ausencia</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Tu ausencia ha cambiado de estado</h2>
    <p>Hola ${employeeName},</p>
    <p>El estado de tu ausencia ha cambiado a: <strong>${statusLabel}</strong></p>
    <div style="background-color: #fff; padding: 15px; border-radius: 4px; margin: 15px 0;">
      <p><strong>Inicio:</strong> ${startAt}</p>
      <p><strong>Fin:</strong> ${endAt}</p>
      <p><strong>Nuevo estado:</strong> ${statusLabel}</p>
    </div>
    <p>Puedes ver más detalles en la aplicación.</p>
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Este es un mensaje automático. Por favor, no respondas a este correo.
    </p>
  </div>
</body>
</html>
    `.trim();
  }
}
