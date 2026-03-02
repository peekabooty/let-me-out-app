import { NotFoundException } from '@nestjs/common';
import { AbsenceUnit } from '@repo/types';

import { AbsenceType } from '../../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../../domain/ports/absence-type.repository.port';
import { AbsenceTypeMapper } from '../../infrastructure/absence-type.mapper';
import { GetAbsenceTypeQuery } from './get-absence-type.query';
import { GetAbsenceTypeHandler } from './get-absence-type.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeRepo = (
  overrides: Partial<AbsenceTypeRepositoryPort> = {}
): AbsenceTypeRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllActive: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  ...overrides,
});

describe('GetAbsenceTypeHandler', () => {
  it('returns an absence type by id', async () => {
    const absenceType = new AbsenceType({
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
      findById: jest.fn().mockResolvedValue(absenceType),
    });
    const mapper = new AbsenceTypeMapper();
    const handler = new GetAbsenceTypeHandler(repo, mapper);
    const query = new GetAbsenceTypeQuery('test-id');

    const result = await handler.execute(query);

    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Vacation');
    expect(result.unit).toBe(AbsenceUnit.DAYS);
    expect(result.maxPerYear).toBe(22);
  });

  it('throws NotFoundException if absence type not found', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const mapper = new AbsenceTypeMapper();
    const handler = new GetAbsenceTypeHandler(repo, mapper);
    const query = new GetAbsenceTypeQuery('non-existent-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });
});
