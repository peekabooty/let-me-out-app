import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { GetDashboardQuery } from './get-dashboard.query';
import { DashboardResponseDto } from '../dtos/dashboard-response.dto';
import { AbsenceTypeBalanceDto } from '../dtos/absence-type-balance.dto';
import { UpcomingAbsenceDto } from '../dtos/upcoming-absence.dto';
import { PendingValidationDto } from '../dtos/pending-validation.dto';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import {
  AbsenceTypeRepositoryPort,
  ABSENCE_TYPE_REPOSITORY_PORT,
} from '../../../absence-types/domain/ports/absence-type.repository.port';
import { AnnualLimitValidatorService } from '../../domain/services/annual-limit-validator.service';

/**
 * Handler for GetDashboardQuery (RF-55).
 *
 * Returns dashboard data including:
 * - Balance for each active absence type in the current year
 * - Upcoming absences (limited to 10)
 * - Pending validations (only for validators)
 */
@QueryHandler(GetDashboardQuery)
export class GetDashboardHandler implements IQueryHandler<GetDashboardQuery, DashboardResponseDto> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly absenceTypeRepository: AbsenceTypeRepositoryPort,
    private readonly annualLimitValidator: AnnualLimitValidatorService
  ) {}

  async execute(query: GetDashboardQuery): Promise<DashboardResponseDto> {
    const { userId } = query;
    const currentYear = new Date().getFullYear();

    // Get all active absence types
    const absenceTypes = await this.absenceTypeRepository.findAllActive();

    // Calculate balance for each absence type
    const balances: AbsenceTypeBalanceDto[] = await Promise.all(
      absenceTypes.map(async (absenceType) => {
        const remaining = await this.annualLimitValidator.calculateRemainingBalance(
          userId,
          absenceType.id,
          currentYear,
          absenceType.maxPerYear,
          absenceType.unit
        );

        const consumed = absenceType.maxPerYear - remaining;

        return {
          absenceTypeId: absenceType.id,
          absenceTypeName: absenceType.name,
          unit: absenceType.unit,
          maxPerYear: absenceType.maxPerYear,
          consumed,
          remaining,
        };
      })
    );

    // Get upcoming absences
    const upcomingAbsencesData = await this.absenceRepository.findUpcomingAbsences(userId);
    const upcomingAbsences: UpcomingAbsenceDto[] = upcomingAbsencesData.map((absence) => ({
      id: absence.id,
      absenceTypeName: absence.absenceTypeName,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
    }));

    // Get pending validations
    const pendingValidationsData = await this.absenceRepository.findPendingValidations(userId);
    const pendingValidations: PendingValidationDto[] = pendingValidationsData.map((absence) => ({
      id: absence.id,
      userName: absence.userName,
      absenceTypeName: absence.absenceTypeName,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      createdAt: absence.createdAt.toISOString(),
    }));

    return {
      balances,
      upcomingAbsences,
      pendingValidations,
    };
  }
}
