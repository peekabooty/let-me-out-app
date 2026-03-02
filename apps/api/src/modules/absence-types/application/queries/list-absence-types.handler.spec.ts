import { AbsenceUnit } from '@repo/types';

import { AbsenceType } from '../../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../../domain/ports/absence-type.repository.port';
import { AbsenceTypeMapper } from '../../infrastructure/absence-type.mapper';
import { ListAbsenceTypesQuery } from './list-absence-types.query';
import { ListAbsenceTypesHandler } from './list-absence-types.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeRepo = (
  overrides: Partial<AbsenceTypeRepositoryPort> = {}
): AbsenceTypeRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  findAllActive: jest.fn().mockResolvedValue([]),
  save: jest.fn(),
  update: jest.fn(),
  ...overrides,
});

describe('ListAbsenceTypesHandler', () => {
  it('returns all absence types when onlyActive is false', async () => {
    const activeType = new AbsenceType({
      id: 'active-id',
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
    const inactiveType = new AbsenceType({
      id: 'inactive-id',
      name: 'Old Type',
      unit: AbsenceUnit.HOURS,
      maxPerYear: 100,
      minDuration: 1,
      maxDuration: 8,
      requiresValidation: false,
      allowPastDates: true,
      minDaysInAdvance: null,
      isActive: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const repo = makeRepo({
      findAll: jest.fn().mockResolvedValue([activeType, inactiveType]),
    });
    const mapper = new AbsenceTypeMapper();
    const handler = new ListAbsenceTypesHandler(repo, mapper);
    const query = new ListAbsenceTypesQuery(false);

    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('active-id');
    expect(result[1].id).toBe('inactive-id');
    expect(repo.findAll).toHaveBeenCalledTimes(1);
    expect(repo.findAllActive).not.toHaveBeenCalled();
  });

  it('returns only active absence types when onlyActive is true', async () => {
    const activeType = new AbsenceType({
      id: 'active-id',
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
      findAllActive: jest.fn().mockResolvedValue([activeType]),
    });
    const mapper = new AbsenceTypeMapper();
    const handler = new ListAbsenceTypesHandler(repo, mapper);
    const query = new ListAbsenceTypesQuery(true);

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('active-id');
    expect(result[0].isActive).toBe(true);
    expect(repo.findAllActive).toHaveBeenCalledTimes(1);
    expect(repo.findAll).not.toHaveBeenCalled();
  });
});
