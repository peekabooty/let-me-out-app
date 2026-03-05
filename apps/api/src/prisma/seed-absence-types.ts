import { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

/**
 * Predefined absence types as defined in functional requirements RF-10..RF-22.
 *
 * Each entry uses a stable slug as lookup key to ensure idempotency across runs.
 */
const PREDEFINED_ABSENCE_TYPES = [
  {
    slug: 'unpaid-planned',
    name: 'Ausencia no retribuida planeada',
    unit: 'hours',
    maxPerYear: 80, // RF-13
    minDuration: 1, // RF-12
    maxDuration: 8, // RF-12
    requiresValidation: false, // RF-10
    allowPastDates: false, // RF-11 (future only)
    minDaysInAdvance: null, // RF-11: future-only but no advance-notice requirement
  },
  {
    slug: 'unpaid-unplanned',
    name: 'Ausencia no retribuida no planeada',
    unit: 'hours',
    maxPerYear: 24, // RF-17
    minDuration: 1, // RF-16
    maxDuration: 8, // RF-16
    requiresValidation: false, // RF-14
    allowPastDates: true, // RF-15 (past and future)
    minDaysInAdvance: null,
  },
  {
    slug: 'paid',
    name: 'Ausencia retribuida',
    unit: 'days',
    maxPerYear: 12, // RF-21: max 12 working days
    minDuration: 1, // RF-21: min 1 working day
    maxDuration: 12, // RF-21
    requiresValidation: true, // RF-18
    allowPastDates: false, // RF-19 (future only)
    minDaysInAdvance: 15, // RF-20: 15 calendar days in advance
  },
] as const;

export async function seedAbsenceTypes(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  for (const type of PREDEFINED_ABSENCE_TYPES) {
    const existing = await prisma.absence_type.findFirst({
      where: { name: type.name },
    });

    if (existing) {
      console.info(`Seed: absence type "${type.name}" already exists — skipping.`);
      continue;
    }

    await prisma.absence_type.create({
      data: {
        id: uuidv7(),
        name: type.name,
        unit: type.unit,
        max_per_year: type.maxPerYear,
        min_duration: type.minDuration,
        max_duration: type.maxDuration,
        requires_validation: type.requiresValidation,
        allow_past_dates: type.allowPastDates,
        min_days_in_advance: type.minDaysInAdvance,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    });

    console.info(`Seed: absence type "${type.name}" created successfully.`);
  }
}
