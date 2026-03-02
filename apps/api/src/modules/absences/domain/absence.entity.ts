import { AbsenceStatus } from '@repo/types';

export interface AbsenceProps {
  id: string;
  userId: string;
  absenceTypeId: string;
  startAt: Date;
  endAt: Date;
  duration: number;
  status: AbsenceStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Absence {
  readonly id: string;
  readonly userId: string;
  readonly absenceTypeId: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly duration: number;
  readonly status: AbsenceStatus | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AbsenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.absenceTypeId = props.absenceTypeId;
    this.startAt = props.startAt;
    this.endAt = props.endAt;
    this.duration = props.duration;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Checks if this absence requires validation workflow (RF-27).
   */
  requiresValidation(): boolean {
    return this.status === AbsenceStatus.WAITING_VALIDATION;
  }

  /**
   * Checks if this absence is in a final state (RF-26, RF-27).
   */
  isFinal(): boolean {
    return (
      this.status === AbsenceStatus.ACCEPTED ||
      this.status === AbsenceStatus.DISCARDED ||
      this.status === AbsenceStatus.CANCELLED ||
      this.status === null
    );
  }

  /**
   * Updates the status of this absence.
   */
  updateStatus(newStatus: AbsenceStatus, now: Date): Absence {
    return new Absence({
      ...this.toProps(),
      status: newStatus,
      updatedAt: now,
    });
  }

  private toProps(): AbsenceProps {
    return {
      id: this.id,
      userId: this.userId,
      absenceTypeId: this.absenceTypeId,
      startAt: this.startAt,
      endAt: this.endAt,
      duration: this.duration,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
