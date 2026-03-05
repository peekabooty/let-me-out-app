import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbsenceUnit } from '@repo/types';
import { AbsenceRepositoryPort, ABSENCE_REPOSITORY_PORT } from '../ports/absence.repository.port';
import { AnnualLimitValidatorService } from './annual-limit-validator.service';

describe('AnnualLimitValidatorService', () => {
  let service: AnnualLimitValidatorService;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;

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
      findByUserId: jest.fn(),
      getStatusHistory: jest.fn(),
      findByValidatorId: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnualLimitValidatorService,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    service = module.get<AnnualLimitValidatorService>(AnnualLimitValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLimit', () => {
    it('should pass validation when requested duration is within annual limit', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 5;
      const unit = AbsenceUnit.DAYS;
      const year = 2026;
      const annualLimit = 20; // 20 days limit

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(10); // 10 days already consumed

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).resolves.not.toThrow();

      expect(mockAbsenceRepository.calculateConsumedByUserAndTypeInYear).toHaveBeenCalledWith(
        userId,
        absenceTypeId,
        year,
        unit
      );
    });

    it('should pass validation when requested duration exactly matches remaining balance', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 10;
      const unit = AbsenceUnit.DAYS;
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(10); // 10 days consumed, 10 remaining

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when requested duration exceeds remaining balance', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 15;
      const unit = AbsenceUnit.DAYS;
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(10); // 10 days consumed, only 10 remaining

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).rejects.toThrow(
        'The requested absence duration exceeds the remaining annual limit. Requested: 15 DAYS, Remaining: 10 DAYS'
      );
    });

    it('should throw BadRequestException when annual limit is already fully consumed', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 1;
      const unit = AbsenceUnit.DAYS;
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(20); // All 20 days consumed

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).rejects.toThrow(
        'The requested absence duration exceeds the remaining annual limit. Requested: 1 DAYS, Remaining: 0 DAYS'
      );
    });

    it('should work correctly with HOURS unit', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 8;
      const unit = AbsenceUnit.HOURS;
      const year = 2026;
      const annualLimit = 40; // 40 hours limit

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(30); // 30 hours consumed, 10 remaining

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException with HOURS unit when limit exceeded', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const requestedDuration = 8;
      const unit = AbsenceUnit.HOURS;
      const year = 2026;
      const annualLimit = 40;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(35); // 35 hours consumed, only 5 remaining

      // Act & Assert
      await expect(
        service.validateLimit(userId, absenceTypeId, requestedDuration, unit, year, annualLimit)
      ).rejects.toThrow(
        'The requested absence duration exceeds the remaining annual limit. Requested: 8 HOURS, Remaining: 5 HOURS'
      );
    });
  });

  describe('calculateRemainingBalance', () => {
    it('should return the full annual limit when no absences consumed', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(0);

      // Act
      const remaining = await service.calculateRemainingBalance(
        userId,
        absenceTypeId,
        year,
        annualLimit,
        AbsenceUnit.DAYS
      );

      // Assert
      expect(remaining).toBe(20);
      expect(mockAbsenceRepository.calculateConsumedByUserAndTypeInYear).toHaveBeenCalledWith(
        userId,
        absenceTypeId,
        year,
        AbsenceUnit.DAYS
      );
    });

    it('should return correct remaining balance when some absences consumed', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(7);

      // Act
      const remaining = await service.calculateRemainingBalance(
        userId,
        absenceTypeId,
        year,
        annualLimit,
        AbsenceUnit.DAYS
      );

      // Assert
      expect(remaining).toBe(13); // 20 - 7
    });

    it('should return 0 when annual limit is fully consumed', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(20);

      // Act
      const remaining = await service.calculateRemainingBalance(
        userId,
        absenceTypeId,
        year,
        annualLimit,
        AbsenceUnit.DAYS
      );

      // Assert
      expect(remaining).toBe(0);
    });

    it('should return 0 when consumed exceeds limit (data integrity edge case)', async () => {
      // Arrange
      const userId = 'user-123';
      const absenceTypeId = 'type-456';
      const year = 2026;
      const annualLimit = 20;

      mockAbsenceRepository.calculateConsumedByUserAndTypeInYear.mockResolvedValue(25); // Over limit (shouldn't happen, but handle gracefully)

      // Act
      const remaining = await service.calculateRemainingBalance(
        userId,
        absenceTypeId,
        year,
        annualLimit,
        AbsenceUnit.DAYS
      );

      // Assert
      expect(remaining).toBe(0); // Max of 0 and negative value
    });
  });
});
