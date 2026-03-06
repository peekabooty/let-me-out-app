import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { Roles } from '../../../common';
import { UserRole } from '@repo/types';
import type { UserResponseDto } from '../application/dtos/user-response.dto';
import { CreateUserDto } from '../application/dtos/create-user.dto';
import { UpdateUserDto } from '../application/dtos/update-user.dto';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UpdateUserCommand } from '../application/commands/update-user.command';
import { DeactivateUserCommand } from '../application/commands/deactivate-user.command';
import { ResendActivationCommand } from '../application/commands/resend-activation.command';
import { ListUsersQuery } from '../application/queries/list-users.query';
import { GetUserQuery } from '../application/queries/get-user.query';

@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<{ id: string }> {
    const id = await this.commandBus.execute<CreateUserCommand, string>(
      new CreateUserCommand(dto.email, dto.name, dto.role)
    );
    return { id };
  }

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.queryBus.execute<ListUsersQuery, UserResponseDto[]>(new ListUsersQuery());
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.queryBus.execute<GetUserQuery, UserResponseDto>(new GetUserQuery(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<void> {
    await this.commandBus.execute<UpdateUserCommand, void>(
      new UpdateUserCommand(id, dto.name, dto.role)
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute<DeactivateUserCommand, void>(new DeactivateUserCommand(id));
  }

  @Post(':id/resend-activation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendActivation(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute<ResendActivationCommand, void>(new ResendActivationCommand(id));
  }
}
