import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { ObservationResponseDto } from '../application/dtos/observation-response.dto';
import { CreateObservationDto } from '../application/dtos/create-observation.dto';
import { CreateObservationCommand } from '../application/commands/create-observation.command';
import { ListObservationsQuery } from '../application/queries/list-observations.query';

/**
 * Controller for observation endpoints.
 *
 * Implements RF-35 (observation section) and RF-36 (access control).
 */
@UseGuards(JwtAuthGuard)
@Controller('absences/:absenceId/observations')
export class ObservationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Creates a new observation on an absence.
   *
   * POST /absences/:absenceId/observations
   *
   * RF-36: Only involved users (creator + validators) can create observations.
   */
  @Post()
  async create(
    @Param('absenceId') absenceId: string,
    @Body() dto: CreateObservationDto,
    @Req() request: Request
  ): Promise<{ id: string }> {
    const user = request.user as { userId: string };

    const id = await this.commandBus.execute<CreateObservationCommand, string>(
      new CreateObservationCommand(absenceId, user.userId, dto.content)
    );

    return { id };
  }

  /**
   * Lists all observations for an absence.
   *
   * GET /absences/:absenceId/observations
   *
   * RF-36: Only involved users (creator + validators) can view observations.
   * Ordered by created_at ascending.
   */
  @Get()
  async findAll(
    @Param('absenceId') absenceId: string,
    @Req() request: Request
  ): Promise<ObservationResponseDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<ListObservationsQuery, ObservationResponseDto[]>(
      new ListObservationsQuery(absenceId, user.userId)
    );
  }
}
