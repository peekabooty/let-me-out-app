import type { AbsenceType } from '../absence-type.entity';

export const ABSENCE_TYPE_REPOSITORY_PORT = Symbol('ABSENCE_TYPE_REPOSITORY_PORT');

export interface AbsenceTypeRepositoryPort {
  findById(id: string): Promise<AbsenceType | null>;
  findAll(): Promise<AbsenceType[]>;
  findAllActive(): Promise<AbsenceType[]>;
  save(absenceType: AbsenceType): Promise<void>;
  update(absenceType: AbsenceType): Promise<void>;
}
