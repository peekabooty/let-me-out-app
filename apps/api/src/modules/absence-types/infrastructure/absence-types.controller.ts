import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@repo/types';

import { Roles } from '../../../common';
import type { AbsenceTypeResponseDto } from '../application/dtos/absence-type-response.dto';
import { CreateAbsenceTypeDto } from '../application/dtos/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from '../application/dtos/update-absence-type.dto';
import { CreateAbsenceTypeCommand } from '../application/commands/create-absence-type.command';
import { UpdateAbsenceTypeCommand } from '../application/commands/update-absence-type.command';
import { DeactivateAbsenceTypeCommand } from '../application/commands/deactivate-absence-type.command';
import { ListAbsenceTypesQuery } from '../application/queries/list-absence-types.query';
import { GetAbsenceTypeQuery } from '../application/queries/get-absence-type.query';

@Controller('absence-types')
export class AbsenceTypesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateAbsenceTypeDto): Promise<{ id: string }> {
    const id = await this.commandBus.execute<CreateAbsenceTypeCommand, string>(
      new CreateAbsenceTypeCommand(
        dto.name,
        dto.unit,
        dto.maxPerYear,
        dto.minDuration,
        dto.maxDuration,
        dto.requiresValidation,
        dto.allowPastDates,
        dto.minDaysInAdvance
      )
    );
    return { id };
  }

  @Get()
  async findAll(@Query('onlyActive') onlyActive?: string): Promise<AbsenceTypeResponseDto[]> {
    const activeFilter = onlyActive === 'true';
    return this.queryBus.execute<ListAbsenceTypesQuery, AbsenceTypeResponseDto[]>(
      new ListAbsenceTypesQuery(activeFilter)
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AbsenceTypeResponseDto> {
    return this.queryBus.execute<GetAbsenceTypeQuery, AbsenceTypeResponseDto>(
      new GetAbsenceTypeQuery(id)
    );
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAbsenceTypeDto): Promise<void> {
    await this.commandBus.execute<UpdateAbsenceTypeCommand, void>(
      new UpdateAbsenceTypeCommand(
        id,
        dto.name,
        dto.maxPerYear,
        dto.minDuration,
        dto.maxDuration,
        dto.requiresValidation,
        dto.allowPastDates,
        dto.minDaysInAdvance
      )
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute<DeactivateAbsenceTypeCommand, void>(
      new DeactivateAbsenceTypeCommand(id)
    );
  }
}
