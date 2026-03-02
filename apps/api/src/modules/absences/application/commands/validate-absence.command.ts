import { ValidationDecision } from '@repo/types';

/**
 * Command to validate (accept or reject) an absence.
 *
 * Implements RF-33 (validators act in parallel) and RF-34 (validator cannot validate own absence).
 */
export class ValidateAbsenceCommand {
  constructor(
    public readonly absenceId: string,
    public readonly validatorId: string,
    public readonly decision: ValidationDecision
  ) {}
}
