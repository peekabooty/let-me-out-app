import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { CalendarAbsenceResponseDto } from '../application/dtos/calendar-absence-response.dto';
import { GetCalendarAbsencesQuery } from '../application/queries/get-calendar-absences.query';

/**
 * Controller for absence endpoints.
 *
 * Implements RF-46 (calendar view), RF-69 (team absences), and RF-70 (color distinction).
 */
@UseGuards(JwtAuthGuard)
@Controller('absences')
export class AbsencesController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Gets calendar absences for the authenticated user.
   *
   * GET /absences/calendar
   *
   * Returns:
   * - All absences of the requesting user (regardless of status)
   * - All absences of team members in shared teams
   * - Includes team color information for proper frontend rendering
   *
   * RF-46: Calendar view for standard users and validators
   * RF-69: Show team members' absences
   * RF-70: Different colors for own absences vs team absences
   * RF-71: Team absences are read-only (enforced in frontend)
   */
  @Get('calendar')
  async getCalendarAbsences(@Req() request: Request): Promise<CalendarAbsenceResponseDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<GetCalendarAbsencesQuery, CalendarAbsenceResponseDto[]>(
      new GetCalendarAbsencesQuery(user.userId)
    );
  }
}
