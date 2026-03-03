import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetDashboardQuery } from '../application/queries/get-dashboard.query';
import { DashboardResponseDto } from '../application/dtos/dashboard-response.dto';

/**
 * Controller for dashboard endpoints (RF-55).
 *
 * Provides dashboard data including:
 * - Balance for each absence type
 * - Upcoming absences
 * - Pending validations (for validators)
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * GET /dashboard
   *
   * Returns dashboard data for the authenticated user (RF-55).
   *
   * @returns Dashboard data with balances, upcoming absences, and pending validations
   */
  @Get()
  async getDashboard(@Request() req: { user: { sub: string } }): Promise<DashboardResponseDto> {
    const query = new GetDashboardQuery(req.user.sub);
    return this.queryBus.execute<GetDashboardQuery, DashboardResponseDto>(query);
  }
}
