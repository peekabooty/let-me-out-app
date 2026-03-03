import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

import { ClockService } from '../../../../common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { AbsenceStateMachineService } from '../../domain/services/absence-state-machine.service';
import { CancelAbsenceHandler } from './cancel-absence.handler';
import { CancelAbsenceCommand } from './cancel-absence.command';
import { Absence } from '../../domain/absence.entity';

describe('CancelAbsenceHandler', () => {
  let handler: CancelAbsenceHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockClockService: jest.Mocked<ClockService>;

  const now = new Date('2024-03-15T10:00:00Z');
  const futureDate = new Date('2024-04-01T09:00:00Z');
  const pastDate = new Date('2024-03-14T09:00:00Z');
  const absenceId = 'absence-123';
  const userId = 'user-456';
  const otherUserId = 'user-789';

  beforeEach(async () => {
    mockAbsenceRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createStatusHistory: jest.fn(),
      calculateConsumedByUserAndTypeInYear: jest.fn(),
      hasOverlap: jest.fn(),
      createValidationHistory: jest.fn(),
      getValidationHistory: jest.fn(),
      getAssignedValidators: jest.fn(),
      assignValidators: jest.fn(),
      findCalendarAbsences: jest.fn(),
      findUpcomingAbsences: jest.fn(),
      findPendingValidations: jest.fn(),
    };

    mockClockService = {
      now: jest.fn().mockReturnValue(now),
    };

    // Mock PrismaService with $transaction support
    mockPrismaService = {
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelAbsenceHandler,
        AbsenceStateMachineService,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
        {
          provide: ClockService,
          useValue: mockClockService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<CancelAbsenceHandler>(CancelAbsenceHandler);
  });

  describe('RF-51: Cancel accepted absence before start date', () => {
    it('should successfully cancel an accepted absence before its start date', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await handler.execute(command);

      // Verify absence was updated with CANCELLED status
      expect(mockAbsenceRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: absenceId,
          status: AbsenceStatus.CANCELLED,
        })
      );

      // Verify status history was created
      expect(mockAbsenceRepository.createStatusHistory).toHaveBeenCalledWith(
        absenceId,
        AbsenceStatus.ACCEPTED,
        AbsenceStatus.CANCELLED,
        userId,
        now
      );
    });

    it('should throw NotFoundException when absence does not exist', async () => {
      mockAbsenceRepository.findById.mockResolvedValue(null);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        `Absence with ID ${absenceId} not found`
      );
    });

    it('should throw ForbiddenException when user is not the absence creator', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, otherUserId);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Only the absence creator can cancel it'
      );
    });

    it('should throw BadRequestException when absence is not in ACCEPTED status', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        `Only accepted absences can be cancelled. Current status: ${AbsenceStatus.WAITING_VALIDATION}`
      );
    });

    it('should throw BadRequestException when absence has already started', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: pastDate, // Already started
        endAt: new Date('2024-03-20T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot cancel an absence that has already started'
      );
    });

    it('should throw BadRequestException when trying to cancel on the exact start time', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: now, // Same as current time
        endAt: new Date('2024-03-20T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot cancel an absence that has already started'
      );
    });
  });

  describe('RF-52: CANCELLED is a final state', () => {
    it('should not allow any further transitions from CANCELLED state', async () => {
      // This is tested via AbsenceStateMachineService
      // The state machine service ensures no transitions from CANCELLED
      const stateMachine = new AbsenceStateMachineService();

      expect(stateMachine.isFinalState(AbsenceStatus.CANCELLED)).toBe(true);
      expect(stateMachine.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.ACCEPTED)).toBe(
        false
      );
      expect(
        stateMachine.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(false);
      expect(
        stateMachine.isTransitionValid(AbsenceStatus.CANCELLED, AbsenceStatus.RECONSIDER)
      ).toBe(false);
    });
  });

  describe('Transaction handling', () => {
    it('should execute all operations within a transaction', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new CancelAbsenceCommand(absenceId, userId);

      await handler.execute(command);

      // Verify transaction was used
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
