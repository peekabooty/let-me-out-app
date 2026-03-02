import { BadRequestException } from '@nestjs/common';
import { AbsenceUnit } from '@repo/types';

import { ClockService } from '../../../../common';
import { AbsenceType } from '../../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../../domain/ports/absence-type.repository.port';
import { CreateAbsenceTypeCommand } from './create-absence-type.command';
import { CreateAbsenceTypeHandler } from './create-absence-type.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeRepo = (
  overrides: Partial<AbsenceTypeRepositoryPort> = {}
): AbsenceTypeRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllActive: jest.fn(),
  save: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
  ...overrides,
});

describe('CreateAbsenceTypeHandler', () => {
  it('creates an absence type and returns its id', async () => {
    const repo = makeRepo();
    const handler = new CreateAbsenceTypeHandler(repo, mockClock);
    const command = new CreateAbsenceTypeCommand(
      'Vacation',
      AbsenceUnit.DAYS,
      22,
      0.5,
      10,
      true,
      false,
      7
    );

    const id = await handler.execute(command);

    expect(typeof id).toBe('string');
    expect(id).toHaveLength(36);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = (repo.save as jest.Mock).mock.calls[0][0] as AbsenceType;
    expect(saved.name).toBe('Vacation');
    expect(saved.unit).toBe(AbsenceUnit.DAYS);
    expect(saved.maxPerYear).toBe(22);
    expect(saved.minDuration).toBe(0.5);
    expect(saved.maxDuration).toBe(10);
    expect(saved.requiresValidation).toBe(true);
    expect(saved.allowPastDates).toBe(false);
    expect(saved.minDaysInAdvance).toBe(7);
    expect(saved.isActive).toBe(true);
  });

  it('throws BadRequestException if minDuration > maxDuration', async () => {
    const repo = makeRepo();
    const handler = new CreateAbsenceTypeHandler(repo, mockClock);
    const command = new CreateAbsenceTypeCommand(
      'Vacation',
      AbsenceUnit.DAYS,
      22,
      10,
      5,
      true,
      false,
      null
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
