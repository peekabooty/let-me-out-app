import { NotFoundException } from '@nestjs/common';
import { AbsenceUnit } from '@repo/types';

import { ClockService } from '../../../../common';
import { AbsenceType } from '../../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../../domain/ports/absence-type.repository.port';
import { DeactivateAbsenceTypeCommand } from './deactivate-absence-type.command';
import { DeactivateAbsenceTypeHandler } from './deactivate-absence-type.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeRepo = (
  overrides: Partial<AbsenceTypeRepositoryPort> = {}
): AbsenceTypeRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllActive: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe('DeactivateAbsenceTypeHandler', () => {
  it('deactivates an absence type', async () => {
    const existingType = new AbsenceType({
      id: 'test-id',
      name: 'Vacation',
      unit: AbsenceUnit.DAYS,
      maxPerYear: 22,
      minDuration: 0.5,
      maxDuration: 10,
      requiresValidation: true,
      allowPastDates: false,
      minDaysInAdvance: 7,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(existingType),
    });
    const handler = new DeactivateAbsenceTypeHandler(repo, mockClock);
    const command = new DeactivateAbsenceTypeCommand('test-id');

    await handler.execute(command);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as AbsenceType;
    expect(updated.isActive).toBe(false);
  });

  it('throws NotFoundException if absence type does not exist', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const handler = new DeactivateAbsenceTypeHandler(repo, mockClock);
    const command = new DeactivateAbsenceTypeCommand('non-existent-id');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
