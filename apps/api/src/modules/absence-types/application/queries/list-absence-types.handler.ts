import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../domain/ports/absence-type.repository.port';
import { AbsenceTypeMapper } from '../../infrastructure/absence-type.mapper';
import type { AbsenceTypeResponseDto } from '../dtos/absence-type-response.dto';
import { ListAbsenceTypesQuery } from './list-absence-types.query';

@Injectable()
@QueryHandler(ListAbsenceTypesQuery)
export class ListAbsenceTypesHandler implements IQueryHandler<
  ListAbsenceTypesQuery,
  AbsenceTypeResponseDto[]
> {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly repository: AbsenceTypeRepositoryPort,
    private readonly mapper: AbsenceTypeMapper
  ) {}

  async execute(query: ListAbsenceTypesQuery): Promise<AbsenceTypeResponseDto[]> {
    const absenceTypes = query.onlyActive
      ? await this.repository.findAllActive()
      : await this.repository.findAll();

    return absenceTypes.map((at) => this.mapper.toResponseDto(at));
  }
}
