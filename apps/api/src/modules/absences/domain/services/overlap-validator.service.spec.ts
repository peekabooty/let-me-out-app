import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AbsenceRepositoryPort, ABSENCE_REPOSITORY_PORT } from '../ports/absence.repository.port';
import { OverlapValidatorService } from './overlap-validator.service';

describe('OverlapValidatorService', () => {
  let service: OverlapValidatorService;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;

  beforeEach(async () => {
    mockAbsenceRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createStatusHistory: jest.fn(),
      calculateConsumedByUserAndTypeInYear: jest.fn(),
      hasOverlap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverlapValidatorService,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    service = module.get<OverlapValidatorService>(OverlapValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation when no overlap exists', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T09:00:00Z');
      const endAt = new Date('2026-03-10T17:00:00Z');

      mockAbsenceRepository.hasOverlap.mockResolvedValue(false);

      // Act & Assert
      await expect(service.validate(userId, startAt, endAt)).resolves.not.toThrow();

      expect(mockAbsenceRepository.hasOverlap).toHaveBeenCalledWith(
        userId,
        startAt,
        endAt,
        undefined
      );
    });

    it('should throw BadRequestException when overlap exists', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T09:00:00Z');
      const endAt = new Date('2026-03-10T17:00:00Z');

      mockAbsenceRepository.hasOverlap.mockResolvedValue(true);

      // Act & Assert
      await expect(service.validate(userId, startAt, endAt)).rejects.toThrow(BadRequestException);

      await expect(service.validate(userId, startAt, endAt)).rejects.toThrow(
        'The requested absence period overlaps with an existing absence'
      );

      expect(mockAbsenceRepository.hasOverlap).toHaveBeenCalledWith(
        userId,
        startAt,
        endAt,
        undefined
      );
    });

    it('should pass excludeAbsenceId to repository when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T09:00:00Z');
      const endAt = new Date('2026-03-10T17:00:00Z');
      const excludeAbsenceId = 'absence-456';

      mockAbsenceRepository.hasOverlap.mockResolvedValue(false);

      // Act
      await service.validate(userId, startAt, endAt, excludeAbsenceId);

      // Assert
      expect(mockAbsenceRepository.hasOverlap).toHaveBeenCalledWith(
        userId,
        startAt,
        endAt,
        excludeAbsenceId
      );
    });

    it('should pass validation when overlap exists but is with excluded absence', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T09:00:00Z');
      const endAt = new Date('2026-03-10T17:00:00Z');
      const excludeAbsenceId = 'absence-456'; // Editing this absence

      // Repository returns false because the only overlap is with the excluded absence
      mockAbsenceRepository.hasOverlap.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.validate(userId, startAt, endAt, excludeAbsenceId)
      ).resolves.not.toThrow();
    });

    it('should work correctly for multi-day absences', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T00:00:00Z');
      const endAt = new Date('2026-03-15T23:59:59Z'); // 6 days

      mockAbsenceRepository.hasOverlap.mockResolvedValue(false);

      // Act & Assert
      await expect(service.validate(userId, startAt, endAt)).resolves.not.toThrow();
    });

    it('should detect overlap for multi-day absences', async () => {
      // Arrange
      const userId = 'user-123';
      const startAt = new Date('2026-03-10T00:00:00Z');
      const endAt = new Date('2026-03-15T23:59:59Z');

      mockAbsenceRepository.hasOverlap.mockResolvedValue(true);

      // Act & Assert
      await expect(service.validate(userId, startAt, endAt)).rejects.toThrow(BadRequestException);
    });
  });
});
