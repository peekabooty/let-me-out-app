import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AbsenceStatus, UserRole } from '@repo/types';

import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { ListAbsencesByRoleHandler } from './list-absences-by-role.handler';
import { ListAbsencesByRoleQuery } from './list-absences-by-role.query';

describe('ListAbsencesByRoleHandler', () => {
  let handler: ListAbsencesByRoleHandler;
  let mockAbsenceRepository: jest.Mocked<
    Pick<AbsenceRepositoryPort, 'findByUserId' | 'findByValidatorId' | 'findAll'>
  >;

  const userId = 'user-abc-123';

  const makeAbsence = (id: string) => ({
    id,
    absenceTypeId: 'type-1',
    absenceTypeName: 'Annual Leave',
    startAt: new Date('2024-04-10T09:00:00Z'),
    endAt: new Date('2024-04-12T18:00:00Z'),
    duration: 3,
    status: AbsenceStatus.WAITING_VALIDATION,
    createdAt: new Date('2024-03-01T10:00:00Z'),
    updatedAt: new Date('2024-03-01T10:00:00Z'),
  });

  beforeEach(async () => {
    mockAbsenceRepository = {
      findByUserId: jest.fn(),
      findByValidatorId: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAbsencesByRoleHandler,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    handler = module.get<ListAbsencesByRoleHandler>(ListAbsencesByRoleHandler);
  });

  describe('STANDARD role (RF-38)', () => {
    it('returns only own absences', async () => {
      const absence = makeAbsence('absence-1');
      mockAbsenceRepository.findByUserId.mockResolvedValue([absence]);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.STANDARD));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('absence-1');
      expect(mockAbsenceRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockAbsenceRepository.findByValidatorId).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.findAll).not.toHaveBeenCalled();
    });

    it('returns empty array when user has no absences', async () => {
      mockAbsenceRepository.findByUserId.mockResolvedValue([]);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.STANDARD));

      expect(result).toEqual([]);
    });
  });

  describe('VALIDATOR role (RF-39)', () => {
    it('returns own absences plus assigned-as-validator absences', async () => {
      const own = makeAbsence('own-1');
      const assigned = makeAbsence('assigned-1');
      mockAbsenceRepository.findByUserId.mockResolvedValue([own]);
      mockAbsenceRepository.findByValidatorId.mockResolvedValue([assigned]);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.VALIDATOR));

      expect(result).toHaveLength(2);
      const ids = result.map((a) => a.id);
      expect(ids).toContain('own-1');
      expect(ids).toContain('assigned-1');
    });

    it('deduplicates absences that appear in both own and assigned lists', async () => {
      const absence = makeAbsence('shared-1');
      mockAbsenceRepository.findByUserId.mockResolvedValue([absence]);
      mockAbsenceRepository.findByValidatorId.mockResolvedValue([absence]);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.VALIDATOR));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('shared-1');
    });

    it('calls both repository methods', async () => {
      mockAbsenceRepository.findByUserId.mockResolvedValue([]);
      mockAbsenceRepository.findByValidatorId.mockResolvedValue([]);

      await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.VALIDATOR));

      expect(mockAbsenceRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockAbsenceRepository.findByValidatorId).toHaveBeenCalledWith(userId);
    });
  });

  describe('AUDITOR role (RF-40)', () => {
    it('returns all absences', async () => {
      const absences = [makeAbsence('a-1'), makeAbsence('a-2'), makeAbsence('a-3')];
      mockAbsenceRepository.findAll.mockResolvedValue(absences);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.AUDITOR));

      expect(result).toHaveLength(3);
      expect(mockAbsenceRepository.findAll).toHaveBeenCalled();
      expect(mockAbsenceRepository.findByUserId).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.findByValidatorId).not.toHaveBeenCalled();
    });
  });

  describe('ADMIN role (RF-41)', () => {
    it('throws ForbiddenException', async () => {
      await expect(
        handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.ADMIN))
      ).rejects.toThrow(ForbiddenException);

      expect(mockAbsenceRepository.findByUserId).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.findByValidatorId).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('DTO mapping', () => {
    it('maps dates to ISO strings', async () => {
      const absence = makeAbsence('absence-1');
      mockAbsenceRepository.findByUserId.mockResolvedValue([absence]);

      const result = await handler.execute(new ListAbsencesByRoleQuery(userId, UserRole.STANDARD));

      expect(result[0].startAt).toBe('2024-04-10T09:00:00.000Z');
      expect(result[0].endAt).toBe('2024-04-12T18:00:00.000Z');
      expect(result[0].createdAt).toBe('2024-03-01T10:00:00.000Z');
      expect(result[0].updatedAt).toBe('2024-03-01T10:00:00.000Z');
    });
  });
});
