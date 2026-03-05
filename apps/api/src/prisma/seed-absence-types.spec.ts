import { PrismaClient } from '@prisma/client';
import { seedAbsenceTypes } from './seed-absence-types';

describe('seedAbsenceTypes', () => {
  const mockCreate = jest.fn();
  const mockFindFirst = jest.fn();

  const prisma = {
    absence_type: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates all three predefined absence types when none exist', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});

    await seedAbsenceTypes(prisma);

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('skips existing absence types (idempotent)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id', name: 'Ausencia no retribuida planeada' });

    await seedAbsenceTypes(prisma);

    // All three types already exist → no creates
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates only missing absence types on partial seed', async () => {
    // First call (unpaid-planned) → exists; second and third → absent
    mockFindFirst
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockCreate.mockResolvedValue({});

    await seedAbsenceTypes(prisma);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('configures "Ausencia no retribuida planeada" with correct RF-10..RF-13 values', async () => {
    mockFindFirst.mockImplementation(async ({ where }: { where: { name: string } }) => {
      // Only let unpaid-planned through
      if (where.name === 'Ausencia no retribuida planeada') return null;
      return { id: 'skip' };
    });
    mockCreate.mockResolvedValue({});

    await seedAbsenceTypes(prisma);

    const callArg = mockCreate.mock.calls[0][0] as {
      data: {
        unit: string;
        max_per_year: number;
        min_duration: number;
        max_duration: number;
        requires_validation: boolean;
        allow_past_dates: boolean;
        min_days_in_advance: null;
        is_active: boolean;
      };
    };
    const data = callArg.data;

    expect(data.unit).toBe('hours');
    expect(data.max_per_year).toBe(80); // RF-13
    expect(data.min_duration).toBe(1); // RF-12
    expect(data.max_duration).toBe(8); // RF-12
    expect(data.requires_validation).toBe(false); // RF-10
    expect(data.allow_past_dates).toBe(false); // RF-11
    expect(data.min_days_in_advance).toBeNull();
    expect(data.is_active).toBe(true);
  });

  it('configures "Ausencia no retribuida no planeada" with correct RF-14..RF-17 values', async () => {
    mockFindFirst.mockImplementation(async ({ where }: { where: { name: string } }) => {
      if (where.name === 'Ausencia no retribuida no planeada') return null;
      return { id: 'skip' };
    });
    mockCreate.mockResolvedValue({});

    await seedAbsenceTypes(prisma);

    const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data;

    expect(data['unit']).toBe('hours');
    expect(data['max_per_year']).toBe(24); // RF-17
    expect(data['min_duration']).toBe(1); // RF-16
    expect(data['max_duration']).toBe(8); // RF-16
    expect(data['requires_validation']).toBe(false); // RF-14
    expect(data['allow_past_dates']).toBe(true); // RF-15
    expect(data['min_days_in_advance']).toBeNull();
  });

  it('configures "Ausencia retribuida" with correct RF-18..RF-22 values', async () => {
    mockFindFirst.mockImplementation(async ({ where }: { where: { name: string } }) => {
      if (where.name === 'Ausencia retribuida') return null;
      return { id: 'skip' };
    });
    mockCreate.mockResolvedValue({});

    await seedAbsenceTypes(prisma);

    const data = (mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data;

    expect(data['unit']).toBe('days'); // RF-22
    expect(data['max_per_year']).toBe(12); // RF-21
    expect(data['min_duration']).toBe(1); // RF-21
    expect(data['max_duration']).toBe(12); // RF-21
    expect(data['requires_validation']).toBe(true); // RF-18
    expect(data['allow_past_dates']).toBe(false); // RF-19
    expect(data['min_days_in_advance']).toBe(15); // RF-20
  });
});
