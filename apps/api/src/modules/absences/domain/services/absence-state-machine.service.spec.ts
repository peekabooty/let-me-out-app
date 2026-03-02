import { AbsenceStatus } from '@repo/types';
import { AbsenceStateMachineService } from './absence-state-machine.service';

describe('AbsenceStateMachineService', () => {
  let service: AbsenceStateMachineService;

  beforeEach(() => {
    service = new AbsenceStateMachineService();
  });

  describe('isFinalState', () => {
    it('should return false for ACCEPTED (can transition to CANCELLED per RF-51)', () => {
      expect(service.isFinalState(AbsenceStatus.ACCEPTED)).toBe(false);
    });

    it('should return true for DISCARDED', () => {
      expect(service.isFinalState(AbsenceStatus.DISCARDED)).toBe(true);
    });

    it('should return true for CANCELLED', () => {
      expect(service.isFinalState(AbsenceStatus.CANCELLED)).toBe(true);
    });

    it('should return true for null', () => {
      expect(service.isFinalState(null)).toBe(true);
    });

    it('should return false for WAITING_VALIDATION', () => {
      expect(service.isFinalState(AbsenceStatus.WAITING_VALIDATION)).toBe(false);
    });

    it('should return false for RECONSIDER', () => {
      expect(service.isFinalState(AbsenceStatus.RECONSIDER)).toBe(false);
    });
  });

  describe('isTransitionValid - RF-30: From WAITING_VALIDATION', () => {
    it('should allow transition to RECONSIDER', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.RECONSIDER)
      ).toBe(true);
    });

    it('should allow transition to ACCEPTED', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.ACCEPTED)
      ).toBe(true);
    });

    it('should allow transition to CANCELLED', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.CANCELLED)
      ).toBe(true);
    });

    it('should not allow transition to DISCARDED', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.DISCARDED)
      ).toBe(false);
    });

    it('should not allow staying in WAITING_VALIDATION', () => {
      expect(
        service.isTransitionValid(
          AbsenceStatus.WAITING_VALIDATION,
          AbsenceStatus.WAITING_VALIDATION
        )
      ).toBe(false);
    });
  });

  describe('isTransitionValid - RF-31: From RECONSIDER', () => {
    it('should allow transition to WAITING_VALIDATION (resubmit)', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.RECONSIDER, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(true);
    });

    it('should allow transition to DISCARDED', () => {
      expect(service.isTransitionValid(AbsenceStatus.RECONSIDER, AbsenceStatus.DISCARDED)).toBe(
        true
      );
    });

    it('should allow transition to CANCELLED', () => {
      expect(service.isTransitionValid(AbsenceStatus.RECONSIDER, AbsenceStatus.CANCELLED)).toBe(
        true
      );
    });

    it('should not allow transition to ACCEPTED', () => {
      expect(service.isTransitionValid(AbsenceStatus.RECONSIDER, AbsenceStatus.ACCEPTED)).toBe(
        false
      );
    });

    it('should not allow staying in RECONSIDER', () => {
      expect(service.isTransitionValid(AbsenceStatus.RECONSIDER, AbsenceStatus.RECONSIDER)).toBe(
        false
      );
    });
  });

  describe('isTransitionValid - RF-32: Final states', () => {
    it('should only allow transition to CANCELLED from ACCEPTED (RF-51)', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.ACCEPTED, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(false);
      expect(service.isTransitionValid(AbsenceStatus.ACCEPTED, AbsenceStatus.RECONSIDER)).toBe(
        false
      );
      expect(service.isTransitionValid(AbsenceStatus.ACCEPTED, AbsenceStatus.DISCARDED)).toBe(
        false
      );
      // RF-51: Creator can cancel ACCEPTED absence before start date
      expect(service.isTransitionValid(AbsenceStatus.ACCEPTED, AbsenceStatus.CANCELLED)).toBe(true);
    });

    it('should not allow any transition from DISCARDED', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.DISCARDED, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(false);
      expect(service.isTransitionValid(AbsenceStatus.DISCARDED, AbsenceStatus.RECONSIDER)).toBe(
        false
      );
      expect(service.isTransitionValid(AbsenceStatus.DISCARDED, AbsenceStatus.ACCEPTED)).toBe(
        false
      );
      expect(service.isTransitionValid(AbsenceStatus.DISCARDED, AbsenceStatus.CANCELLED)).toBe(
        false
      );
    });

    it('should not allow any transition from CANCELLED', () => {
      expect(
        service.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(false);
      expect(service.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.RECONSIDER)).toBe(
        false
      );
      expect(service.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.ACCEPTED)).toBe(
        false
      );
      expect(service.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.DISCARDED)).toBe(
        false
      );
    });
  });

  describe('isTransitionValid - Initial state (null)', () => {
    it('should allow transition from null to WAITING_VALIDATION', () => {
      expect(service.isTransitionValid(null, AbsenceStatus.WAITING_VALIDATION)).toBe(true);
    });

    it('should not allow transition from null to other states', () => {
      expect(service.isTransitionValid(null, AbsenceStatus.RECONSIDER)).toBe(false);
      expect(service.isTransitionValid(null, AbsenceStatus.ACCEPTED)).toBe(false);
      expect(service.isTransitionValid(null, AbsenceStatus.DISCARDED)).toBe(false);
      expect(service.isTransitionValid(null, AbsenceStatus.CANCELLED)).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() =>
        service.validateTransition(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.ACCEPTED)
      ).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      expect(() =>
        service.validateTransition(AbsenceStatus.ACCEPTED, AbsenceStatus.RECONSIDER)
      ).toThrow('Invalid status transition from accepted to reconsider');
    });

    it('should throw for invalid transition from WAITING_VALIDATION to DISCARDED', () => {
      expect(() =>
        service.validateTransition(AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.DISCARDED)
      ).toThrow('Invalid status transition from waiting_validation to discarded');
    });
  });
});
