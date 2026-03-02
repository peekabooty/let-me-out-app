import { AbsenceStatus } from '@repo/types';

export class AbsenceResponseDto {
  id!: string;
  userId!: string;
  absenceTypeId!: string;
  startAt!: string;
  endAt!: string;
  duration!: number;
  status!: AbsenceStatus | null;
  createdAt!: string;
  updatedAt!: string;
}
