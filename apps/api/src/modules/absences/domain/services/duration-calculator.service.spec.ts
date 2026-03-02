import { Test, TestingModule } from '@nestjs/testing';

import { AbsenceUnit } from '@repo/types';
import { ClockService } from '../../../../common/clock/clock.service';
import { DurationCalculatorService } from './duration-calculator.service';

describe('DurationCalculatorService', () => {
  let service: DurationCalculatorService;
  let mockClockService: jest.Mocked<ClockService>;

  beforeEach(async () => {
    mockClockService = {
      now: jest.fn().mockReturnValue(new Date('2026-03-02T12:00:00Z')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DurationCalculatorService,
        {
          provide: ClockService,
          useValue: mockClockService,
        },
      ],
    }).compile();

    service = module.get<DurationCalculatorService>(DurationCalculatorService);
  });

  describe('calculateDuration with HOURS unit', () => {
    it('calculates duration in hours for same-day absence', () => {
      const startAt = new Date('2024-03-15T09:00:00Z');
      const endAt = new Date('2024-03-15T17:00:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.HOURS);

      expect(duration).toBe(8);
    });

    it('calculates duration in hours spanning multiple days', () => {
      const startAt = new Date('2024-03-15T09:00:00Z');
      const endAt = new Date('2024-03-16T13:00:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.HOURS);

      expect(duration).toBe(28);
    });

    it('rounds up partial hours', () => {
      const startAt = new Date('2024-03-15T09:00:00Z');
      const endAt = new Date('2024-03-15T10:30:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.HOURS);

      expect(duration).toBe(2);
    });

    it('returns 0 for same start and end time', () => {
      const startAt = new Date('2024-03-15T09:00:00Z');
      const endAt = new Date('2024-03-15T09:00:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.HOURS);

      expect(duration).toBe(0);
    });

    it('returns 0 if end is before start', () => {
      const startAt = new Date('2024-03-15T17:00:00Z');
      const endAt = new Date('2024-03-15T09:00:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.HOURS);

      expect(duration).toBe(0);
    });
  });

  describe('calculateDuration with DAYS unit', () => {
    it('calculates 1 business day for same day (Friday)', () => {
      const startAt = new Date('2024-03-15T09:00:00Z'); // Friday
      const endAt = new Date('2024-03-15T17:00:00Z'); // Friday

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(1);
    });

    it('calculates 5 business days for Monday to Friday', () => {
      const startAt = new Date('2024-03-11T09:00:00Z'); // Monday
      const endAt = new Date('2024-03-15T17:00:00Z'); // Friday

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(5);
    });

    it('excludes weekends from calculation', () => {
      const startAt = new Date('2024-03-15T09:00:00Z'); // Friday
      const endAt = new Date('2024-03-18T17:00:00Z'); // Monday

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(2); // Friday and Monday only
    });

    it('calculates 0 business days for weekend-only period', () => {
      const startAt = new Date('2024-03-16T09:00:00Z'); // Saturday
      const endAt = new Date('2024-03-17T17:00:00Z'); // Sunday

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(0);
    });

    it('calculates 10 business days for two-week period', () => {
      const startAt = new Date('2024-03-11T09:00:00Z'); // Monday
      const endAt = new Date('2024-03-22T17:00:00Z'); // Friday (two weeks later)

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(10);
    });

    it('handles partial days by counting the start and end days', () => {
      const startAt = new Date('2024-03-11T14:30:00Z'); // Monday afternoon
      const endAt = new Date('2024-03-13T10:00:00Z'); // Wednesday morning

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(3); // Monday, Tuesday, Wednesday
    });

    it('returns 0 business days if end is before start', () => {
      const startAt = new Date('2024-03-15T09:00:00Z');
      const endAt = new Date('2024-03-14T17:00:00Z');

      const duration = service.calculateDuration(startAt, endAt, AbsenceUnit.DAYS);

      expect(duration).toBe(0);
    });
  });
});
