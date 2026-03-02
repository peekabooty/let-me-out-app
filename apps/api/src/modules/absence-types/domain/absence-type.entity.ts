import { AbsenceUnit } from '@repo/types';

export interface AbsenceTypeProps {
  id: string;
  name: string;
  unit: AbsenceUnit;
  maxPerYear: number;
  minDuration: number;
  maxDuration: number;
  requiresValidation: boolean;
  allowPastDates: boolean;
  minDaysInAdvance: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AbsenceType {
  readonly id: string;
  readonly name: string;
  readonly unit: AbsenceUnit;
  readonly maxPerYear: number;
  readonly minDuration: number;
  readonly maxDuration: number;
  readonly requiresValidation: boolean;
  readonly allowPastDates: boolean;
  readonly minDaysInAdvance: number | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AbsenceTypeProps) {
    this.id = props.id;
    this.name = props.name;
    this.unit = props.unit;
    this.maxPerYear = props.maxPerYear;
    this.minDuration = props.minDuration;
    this.maxDuration = props.maxDuration;
    this.requiresValidation = props.requiresValidation;
    this.allowPastDates = props.allowPastDates;
    this.minDaysInAdvance = props.minDaysInAdvance;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Determines if this absence type requires validation workflow (RF-19).
   */
  needsValidation(): boolean {
    return this.requiresValidation;
  }

  /**
   * Checks if this absence type allows requests for past dates (RF-20).
   */
  canRequestPastDates(): boolean {
    return this.allowPastDates;
  }

  /**
   * Checks if a given duration is within the allowed range for this type (RF-21).
   */
  isDurationValid(duration: number): boolean {
    return duration >= this.minDuration && duration <= this.maxDuration;
  }

  /**
   * Returns the minimum days in advance required for this type, or null if not applicable (RF-22).
   */
  getMinDaysInAdvance(): number | null {
    return this.minDaysInAdvance;
  }

  /**
   * Deactivates this absence type (RF-18).
   */
  deactivate(now: Date): AbsenceType {
    return new AbsenceType({ ...this.toProps(), isActive: false, updatedAt: now });
  }

  /**
   * Activates this absence type.
   */
  activate(now: Date): AbsenceType {
    return new AbsenceType({ ...this.toProps(), isActive: true, updatedAt: now });
  }

  /**
   * Updates the name of this absence type.
   */
  rename(newName: string, now: Date): AbsenceType {
    return new AbsenceType({ ...this.toProps(), name: newName, updatedAt: now });
  }

  /**
   * Updates the configuration of this absence type.
   */
  updateConfig(
    config: {
      maxPerYear?: number;
      minDuration?: number;
      maxDuration?: number;
      requiresValidation?: boolean;
      allowPastDates?: boolean;
      minDaysInAdvance?: number | null;
    },
    now: Date
  ): AbsenceType {
    return new AbsenceType({
      ...this.toProps(),
      maxPerYear: config.maxPerYear ?? this.maxPerYear,
      minDuration: config.minDuration ?? this.minDuration,
      maxDuration: config.maxDuration ?? this.maxDuration,
      requiresValidation: config.requiresValidation ?? this.requiresValidation,
      allowPastDates: config.allowPastDates ?? this.allowPastDates,
      minDaysInAdvance:
        config.minDaysInAdvance === undefined ? this.minDaysInAdvance : config.minDaysInAdvance,
      updatedAt: now,
    });
  }

  private toProps(): AbsenceTypeProps {
    return {
      id: this.id,
      name: this.name,
      unit: this.unit,
      maxPerYear: this.maxPerYear,
      minDuration: this.minDuration,
      maxDuration: this.maxDuration,
      requiresValidation: this.requiresValidation,
      allowPastDates: this.allowPastDates,
      minDaysInAdvance: this.minDaysInAdvance,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
