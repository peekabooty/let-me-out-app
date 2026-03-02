import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AbsenceUnit } from '@repo/types';

import { ClockService } from '../../../../common';
import { AbsenceType } from '../../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../../domain/ports/absence-type.repository.port';
import { UpdateAbsenceTypeCommand } from './update-absence-type.command';
import { UpdateAbsenceTypeHandler } from './update-absence-type.handler';

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

describe('UpdateAbsenceTypeHandler', () => {
  it('updates an absence type name', async () => {
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
    const handler = new UpdateAbsenceTypeHandler(repo, mockClock);
    const command = new UpdateAbsenceTypeCommand('test-id', 'Annual Leave');

    await handler.execute(command);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as AbsenceType;
    expect(updated.name).toBe('Annual Leave');
  });

  it('updates multiple config properties', async () => {
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
    const handler = new UpdateAbsenceTypeHandler(repo, mockClock);
    const command = new UpdateAbsenceTypeCommand(
      'test-id',
      undefined,
      25,
      1,
      15,
      false,
      true,
      null
    );

    await handler.execute(command);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as AbsenceType;
    expect(updated.maxPerYear).toBe(25);
    expect(updated.minDuration).toBe(1);
    expect(updated.maxDuration).toBe(15);
    expect(updated.requiresValidation).toBe(false);
    expect(updated.allowPastDates).toBe(true);
    expect(updated.minDaysInAdvance).toBe(null);
  });

  it('throws NotFoundException if absence type does not exist', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const handler = new UpdateAbsenceTypeHandler(repo, mockClock);
    const command = new UpdateAbsenceTypeCommand('non-existent-id', 'New Name');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException if updated minDuration > maxDuration', async () => {
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
    const handler = new UpdateAbsenceTypeHandler(repo, mockClock);
    const command = new UpdateAbsenceTypeCommand('test-id', undefined, undefined, 15, 5);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
