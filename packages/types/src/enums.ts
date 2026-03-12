export enum UserRole {
  STANDARD = 'standard',
  VALIDATOR = 'validator',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
}

export enum AbsenceStatus {
  WAITING_VALIDATION = 'waiting_validation',
  RECONSIDER = 'reconsider',
  ACCEPTED = 'accepted',
  DISCARDED = 'discarded',
  CANCELLED = 'cancelled',
}

export enum ValidationDecision {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum AbsenceUnit {
  HOURS = 'hours',
  DAYS = 'days',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  CARAMEL = 'caramel',
  CHOCOLATE = 'chocolate',
}
