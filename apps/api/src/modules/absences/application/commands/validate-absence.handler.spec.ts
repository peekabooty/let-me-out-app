import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { AbsenceStatus, ValidationDecision } from '@repo/types';

import { ClockService } from '../../../../common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { AbsenceStateMachineService } from '../../domain/services/absence-state-machine.service';
import { ValidateAbsenceHandler } from './validate-absence.handler';
import { ValidateAbsenceCommand } from './validate-absence.command';
import { Absence } from '../../domain/absence.entity';

describe('ValidateAbsenceHandler', () => {
  let handler: ValidateAbsenceHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockClockService: jest.Mocked<ClockService>;
  const now = new Date('2024-03-15T10:00:00Z');
  const absenceId = 'absence-123';
  const userId = 'user-456';
  const validatorId1 = 'validator-789';
  const validatorId2 = 'validator-012';

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
        ValidateAbsenceHandler,
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
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<ValidateAbsenceHandler>(ValidateAbsenceHandler);
  });

  describe('RF-34: Validator cannot validate own absence', () => {
    it('should throw ForbiddenException when validator tries to validate their own absence', async () => {
      const absence = new Absence({
        id: absenceId,
        userId: validatorId1, // Same as validator
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId1,
        ValidationDecision.ACCEPTED
      );

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        'A validator cannot validate their own absence'
      );
    });
  });

  describe('Absence not found', () => {
    it('should throw NotFoundException when absence does not exist', async () => {
      mockAbsenceRepository.findById.mockResolvedValue(null);

      const command = new ValidateAbsenceCommand(
        'non-existent',
        validatorId1,
        ValidationDecision.ACCEPTED
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Invalid absence status', () => {
    it('should throw BadRequestException when absence is not in WAITING_VALIDATION state', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED, // Final state
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId1,
        ValidationDecision.ACCEPTED
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Absence is in accepted state and cannot be validated'
      );
    });
  });

  describe('Validator not assigned', () => {
    it('should throw ForbiddenException when validator is not assigned to the absence', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);
      mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId2]); // Only validator2

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId1, // Not assigned
        ValidationDecision.ACCEPTED
      );

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        'You are not assigned as a validator for this absence'
      );
    });
  });

  describe('RF-33 & RF-30: Parallel validation with multiple validators', () => {
    it('should not change status when only one of two validators has decided', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);
      mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId1, validatorId2]);
      mockAbsenceRepository.getValidationHistory.mockResolvedValue([
        { validatorId: validatorId1, decision: ValidationDecision.ACCEPTED, decidedAt: now },
      ]);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId1,
        ValidationDecision.ACCEPTED
      );

      await handler.execute(command);

      // Should record validation history
      expect(mockAbsenceRepository.createValidationHistory).toHaveBeenCalledWith(
        absenceId,
        validatorId1,
        ValidationDecision.ACCEPTED,
        now
      );

      // Should NOT update absence status (waiting for validator2)
      expect(mockAbsenceRepository.update).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.createStatusHistory).not.toHaveBeenCalled();
    });

    it('should transition to ACCEPTED when all validators accept (RF-30)', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);
      mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId1, validatorId2]);
      mockAbsenceRepository.getValidationHistory.mockResolvedValue([
        { validatorId: validatorId1, decision: ValidationDecision.ACCEPTED, decidedAt: now },
        { validatorId: validatorId2, decision: ValidationDecision.ACCEPTED, decidedAt: now },
      ]);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId2,
        ValidationDecision.ACCEPTED
      );

      await handler.execute(command);

      // Should update to ACCEPTED
      expect(mockAbsenceRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: absenceId,
          status: AbsenceStatus.ACCEPTED,
        })
      );

      // Should record status history
      expect(mockAbsenceRepository.createStatusHistory).toHaveBeenCalledWith(
        absenceId,
        AbsenceStatus.WAITING_VALIDATION,
        AbsenceStatus.ACCEPTED,
        validatorId2,
        now
      );
    });

    it('should transition to RECONSIDER when at least one validator rejects (RF-30)', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);
      mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId1, validatorId2]);
      mockAbsenceRepository.getValidationHistory.mockResolvedValue([
        { validatorId: validatorId1, decision: ValidationDecision.ACCEPTED, decidedAt: now },
        { validatorId: validatorId2, decision: ValidationDecision.REJECTED, decidedAt: now },
      ]);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId2,
        ValidationDecision.REJECTED
      );

      await handler.execute(command);

      // Should update to RECONSIDER
      expect(mockAbsenceRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: absenceId,
          status: AbsenceStatus.RECONSIDER,
        })
      );

      // Should record status history
      expect(mockAbsenceRepository.createStatusHistory).toHaveBeenCalledWith(
        absenceId,
        AbsenceStatus.WAITING_VALIDATION,
        AbsenceStatus.RECONSIDER,
        validatorId2,
        now
      );
    });
  });

  describe('RF-77: Validation history recording', () => {
    it('should record validation decision in history', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);
      mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId1]);
      mockAbsenceRepository.getValidationHistory.mockResolvedValue([]);

      const command = new ValidateAbsenceCommand(
        absenceId,
        validatorId1,
        ValidationDecision.REJECTED
      );

      await handler.execute(command);

      expect(mockAbsenceRepository.createValidationHistory).toHaveBeenCalledWith(
        absenceId,
        validatorId1,
        ValidationDecision.REJECTED,
        now
      );
    });
  });
});
