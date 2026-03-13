import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  Patch,
  Post,
  ParseFilePipe,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../../../common';
import { UserRole } from '@repo/types';
import type { UserResponseDto } from '../application/dtos/user-response.dto';
import { CreateUserDto } from '../application/dtos/create-user.dto';
import { UpdateUserDto } from '../application/dtos/update-user.dto';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UpdateUserCommand } from '../application/commands/update-user.command';
import { DeactivateUserCommand } from '../application/commands/deactivate-user.command';
import { UpdateUserThemeCommand } from '../application/commands/update-user-theme.command';
import { UpdateUserAvatarCommand } from '../application/commands/update-user-avatar.command';
import { ResendActivationCommand } from '../application/commands/resend-activation.command';
import { ListUsersQuery } from '../application/queries/list-users.query';
import { GetUserQuery } from '../application/queries/get-user.query';
import { UserAvatarResult } from '../application/queries/get-user-avatar.handler';
import { GetUserAvatarQuery } from '../application/queries/get-user-avatar.query';
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

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateMyAvatar(
    @Req() request: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png)$/,
          }),
        ],
      })
    )
    file: Express.Multer.File
  ): Promise<{ avatarUrl: string }> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<UpdateUserAvatarCommand, { avatarUrl: string }>(
      new UpdateUserAvatarCommand(user.userId, file.originalname, file.buffer)
    );
  }

  @Get(':id/avatar')
  async getAvatar(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const result = await this.queryBus.execute<GetUserAvatarQuery, UserAvatarResult>(
      new GetUserAvatarQuery(id)
    );

    response.setHeader('Content-Type', result.mimeType);
    response.send(result.buffer);
  }
}
