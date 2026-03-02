import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../domain/ports/absence-type.repository.port';
import { AbsenceTypeMapper } from '../../infrastructure/absence-type.mapper';
import type { AbsenceTypeResponseDto } from '../dtos/absence-type-response.dto';
import { GetAbsenceTypeQuery } from './get-absence-type.query';

@Injectable()
@QueryHandler(GetAbsenceTypeQuery)
export class GetAbsenceTypeHandler implements IQueryHandler<
  GetAbsenceTypeQuery,
  AbsenceTypeResponseDto
> {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly repository: AbsenceTypeRepositoryPort,
    private readonly mapper: AbsenceTypeMapper
  ) {}

  async execute(query: GetAbsenceTypeQuery): Promise<AbsenceTypeResponseDto> {
    const absenceType = await this.repository.findById(query.id);

    if (!absenceType) {
      throw new NotFoundException(`Absence type with id ${query.id} not found`);
    }

    return this.mapper.toResponseDto(absenceType);
  }
}
