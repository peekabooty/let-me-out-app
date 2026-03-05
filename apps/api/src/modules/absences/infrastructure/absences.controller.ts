import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateAbsenceDto } from '../application/dtos/create-absence.dto';
import { CreateAbsenceCommand } from '../application/commands/create-absence.command';
import { ValidateAbsenceCommand } from '../application/commands/validate-absence.command';
import { CancelAbsenceCommand } from '../application/commands/cancel-absence.command';
import { ReconsiderAbsenceCommand } from '../application/commands/reconsider-absence.command';
import { DiscardAbsenceCommand } from '../application/commands/discard-absence.command';
import { GetCalendarAbsencesQuery } from '../application/queries/get-calendar-absences.query';
import { GetAbsenceDetailQuery } from '../application/queries/get-absence-detail.query';
import { GetAbsenceStatusHistoryQuery } from '../application/queries/get-absence-status-history.query';
import { ListUserAbsencesQuery } from '../application/queries/list-user-absences.query';
import type { CalendarAbsenceResponseDto } from '../application/dtos/calendar-absence-response.dto';
import type { AbsenceDetailResponseDto } from '../application/queries/get-absence-detail.handler';
import type { AbsenceStatusHistoryItemDto } from '../application/queries/get-absence-status-history.handler';
import type { UserAbsenceItemDto } from '../application/queries/list-user-absences.handler';
import { ValidateAbsenceDto } from '../application/dtos/validate-absence.dto';
import { ValidationDecision } from '@repo/types';

/**
 * Controller for absence endpoints.
 *
 * Exposes the full HTTP surface for the absence workflow:
 * - RF-23 to RF-27: Absence creation
 * - RF-29 to RF-32: Status transitions (validate, reconsider, discard, cancel)
 * - RF-33: Parallel validation
 * - RF-51: Cancellation
 * - RF-53, RF-54: Status history
 * - RF-46: Calendar view
 */
@UseGuards(JwtAuthGuard)
@Controller('absences')
export class AbsencesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Lists all absences of the authenticated user.
   *
   * GET /absences
   */
  @Get()
  async listMyAbsences(@Req() request: Request): Promise<UserAbsenceItemDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<ListUserAbsencesQuery, UserAbsenceItemDto[]>(
      new ListUserAbsencesQuery(user.userId)
    );
  }

  /**
   * Gets calendar absences for the authenticated user.
   *
   * GET /absences/calendar
   *
   * RF-46: Calendar view for standard users and validators
   * RF-69: Show team members' absences
   * RF-70: Different colors for own absences vs team absences
   */
  @Get('calendar')
  async getCalendarAbsences(@Req() request: Request): Promise<CalendarAbsenceResponseDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<GetCalendarAbsencesQuery, CalendarAbsenceResponseDto[]>(
      new GetCalendarAbsencesQuery(user.userId)
    );
  }

  /**
   * Gets the detail of a specific absence.
   *
   * GET /absences/:id
   *
   * RF-54: Visible to creator and assigned validators
   */
  @Get(':id')
  async getAbsenceDetail(
    @Param('id') id: string,
    @Req() request: Request
  ): Promise<AbsenceDetailResponseDto> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<GetAbsenceDetailQuery, AbsenceDetailResponseDto>(
      new GetAbsenceDetailQuery(id, user.userId)
    );
  }

  /**
   * Gets the status history of a specific absence.
   *
   * GET /absences/:id/history
   *
   * RF-53: Records status changes
   * RF-54: Visible to creator and assigned validators
   */
  @Get(':id/history')
  async getAbsenceStatusHistory(
    @Param('id') id: string,
    @Req() request: Request
  ): Promise<AbsenceStatusHistoryItemDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<GetAbsenceStatusHistoryQuery, AbsenceStatusHistoryItemDto[]>(
      new GetAbsenceStatusHistoryQuery(id, user.userId)
    );
  }

  /**
   * Creates a new absence request.
   *
   * POST /absences
   *
   * RF-23: Required data for absence creation
   * RF-26, RF-27: Initial status based on validation requirement
   */
  @Post()
  async createAbsence(
    @Body() dto: CreateAbsenceDto,
    @Req() request: Request
  ): Promise<{ id: string }> {
    const user = request.user as { userId: string };

    const id = await this.commandBus.execute<CreateAbsenceCommand, string>(
      new CreateAbsenceCommand(
        user.userId,
        dto.absenceTypeId,
        new Date(dto.startAt),
        new Date(dto.endAt),
        dto.validatorIds ?? []
      )
    );

    return { id };
  }

  /**
   * Validates (accepts or rejects) an absence.
   *
   * POST /absences/:id/validate
   *
   * RF-30: From WAITING_VALIDATION, transitions based on validator decisions
   * RF-33: Parallel validation by assigned validators
   */
  @Post(':id/validate')
  async validateAbsence(
    @Param('id') id: string,
    @Body() dto: ValidateAbsenceDto,
    @Req() request: Request
  ): Promise<void> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<ValidateAbsenceCommand, void>(
      new ValidateAbsenceCommand(id, user.userId, dto.decision as ValidationDecision)
    );
  }

  /**
   * Resubmits an absence for validation from RECONSIDER state.
   *
   * POST /absences/:id/reconsider
   *
   * RF-31: From RECONSIDER, user can resend for validation
   */
  @Post(':id/reconsider')
  async reconsiderAbsence(@Param('id') id: string, @Req() request: Request): Promise<void> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<ReconsiderAbsenceCommand, void>(
      new ReconsiderAbsenceCommand(id, user.userId)
    );
  }

  /**
   * Discards an absence from RECONSIDER state.
   *
   * POST /absences/:id/discard
   *
   * RF-31: From RECONSIDER, user can decide not to continue
   * RF-32: DISCARDED is a final state
   */
  @Post(':id/discard')
  async discardAbsence(@Param('id') id: string, @Req() request: Request): Promise<void> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<DiscardAbsenceCommand, void>(
      new DiscardAbsenceCommand(id, user.userId)
    );
  }

  /**
   * Cancels an accepted absence before its start date.
   *
   * POST /absences/:id/cancel
   *
   * RF-51: Creator can cancel an accepted absence before the start date
   * RF-52: CANCELLED is a final state
   */
  @Post(':id/cancel')
  async cancelAbsence(@Param('id') id: string, @Req() request: Request): Promise<void> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<CancelAbsenceCommand, void>(
      new CancelAbsenceCommand(id, user.userId)
    );
  }
}
