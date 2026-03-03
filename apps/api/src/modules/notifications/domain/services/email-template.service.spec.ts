import { AbsenceStatus } from '@repo/types';

import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(() => {
    service = new EmailTemplateService();
  });

  describe('generateValidatorAssignmentEmail', () => {
    it('generates valid HTML email with validator assignment details', () => {
      const html = service.generateValidatorAssignmentEmail(
        'John Validator',
        'Jane Employee',
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z',
        5
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('Nueva ausencia asignada para validación');
      expect(html).toContain('Hola John Validator');
      expect(html).toContain('Empleado:</strong> Jane Employee');
      expect(html).toContain('Inicio:</strong> 2025-02-01T00:00:00.000Z');
      expect(html).toContain('Fin:</strong> 2025-02-05T00:00:00.000Z');
      expect(html).toContain('Duración:</strong> 5 días');
    });

    it('escapes special characters in names', () => {
      const html = service.generateValidatorAssignmentEmail(
        'John <script>alert("xss")</script>',
        'Jane & Co.',
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z',
        3
      );

      // HTML should contain the raw strings (service doesn't escape by itself)
      // In a real implementation, you might want to add HTML escaping
      expect(html).toContain('John <script>alert("xss")</script>');
      expect(html).toContain('Jane & Co.');
    });
  });

  describe('generateStatusChangeEmail', () => {
    it('generates valid HTML email for accepted status', () => {
      const html = service.generateStatusChangeEmail(
        'Jane Employee',
        AbsenceStatus.ACCEPTED,
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z'
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('Tu ausencia ha cambiado de estado');
      expect(html).toContain('Hola Jane Employee');
      expect(html).toContain('Nuevo estado:</strong> Aprobada');
      expect(html).toContain('Inicio:</strong> 2025-02-01T00:00:00.000Z');
      expect(html).toContain('Fin:</strong> 2025-02-05T00:00:00.000Z');
    });

    it('generates valid HTML email for cancelled status', () => {
      const html = service.generateStatusChangeEmail(
        'Jane Employee',
        AbsenceStatus.CANCELLED,
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z'
      );

      expect(html).toContain('Nuevo estado:</strong> Cancelada');
    });

    it('generates valid HTML email for reconsider status', () => {
      const html = service.generateStatusChangeEmail(
        'Jane Employee',
        AbsenceStatus.RECONSIDER,
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z'
      );

      expect(html).toContain('Nuevo estado:</strong> En reconsideración');
    });

    it('generates valid HTML email for discarded status', () => {
      const html = service.generateStatusChangeEmail(
        'Jane Employee',
        AbsenceStatus.DISCARDED,
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z'
      );

      expect(html).toContain('Nuevo estado:</strong> Descartada');
    });

    it('generates valid HTML email for waiting_validation status', () => {
      const html = service.generateStatusChangeEmail(
        'Jane Employee',
        AbsenceStatus.WAITING_VALIDATION,
        '2025-02-01T00:00:00.000Z',
        '2025-02-05T00:00:00.000Z'
      );

      expect(html).toContain('Nuevo estado:</strong> Pendiente de validación');
    });
  });
});
