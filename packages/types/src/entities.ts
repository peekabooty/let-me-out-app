import type { AbsenceStatus, AbsenceUnit, Theme, UserRole, ValidationDecision } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  themePreference?: Theme | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceType {
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
  createdAt: string;
  updatedAt: string;
}

export interface Absence {
  id: string;
  userId: string;
  absenceTypeId: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceValidationHistory {
  id: string;
  absenceId: string;
  validatorId: string;
  decision: ValidationDecision;
  decidedAt: string;
}

export interface AbsenceStatusHistory {
  id: string;
  absenceId: string;
  fromStatus: AbsenceStatus | null;
  toStatus: AbsenceStatus;
  changedBy: string;
  changedAt: string;
}

export interface Observation {
  id: string;
  absenceId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  absenceId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  observationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
