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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { Roles } from '../../../common';
import { UserRole } from '@repo/types';
import type { UserResponseDto } from '../application/dtos/user-response.dto';
import { CreateUserDto } from '../application/dtos/create-user.dto';
import { UpdateUserDto } from '../application/dtos/update-user.dto';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UpdateUserCommand } from '../application/commands/update-user.command';
import { DeactivateUserCommand } from '../application/commands/deactivate-user.command';
import { UpdateUserThemeCommand } from '../application/commands/update-user-theme.command';
import { ResendActivationCommand } from '../application/commands/resend-activation.command';
import { ListUsersQuery } from '../application/queries/list-users.query';
import { GetUserQuery } from '../application/queries/get-user.query';
import { UpdateThemeDto } from '../dto/update-theme.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateUserDto): Promise<{ id: string }> {
    const id = await this.commandBus.execute<CreateUserCommand, string>(
      new CreateUserCommand(dto.email, dto.name, dto.role)
    );
    return { id };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<UserResponseDto[]> {
    return this.queryBus.execute<ListUsersQuery, UserResponseDto[]>(new ListUsersQuery());
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.queryBus.execute<GetUserQuery, UserResponseDto>(new GetUserQuery(id));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<void> {
    await this.commandBus.execute<UpdateUserCommand, void>(
      new UpdateUserCommand(id, dto.name, dto.role)
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute<DeactivateUserCommand, void>(new DeactivateUserCommand(id));
  }

  @Post(':id/resend-activation')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendActivation(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute<ResendActivationCommand, void>(new ResendActivationCommand(id));
  }

  @Patch('me/theme')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMyTheme(@Req() request: Request, @Body() dto: UpdateThemeDto): Promise<void> {
    const user = request.user as { userId: string };

    await this.commandBus.execute<UpdateUserThemeCommand, void>(
      new UpdateUserThemeCommand(user.userId, dto.theme)
    );
  }
}
