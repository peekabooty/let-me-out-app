import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { Public } from '../../common';
import { ActivateAccountCommand } from '../users/application/commands/activate-account.command';
import { ActivateAccountDto } from '../users/application/dtos/activate-account.dto';

@Controller('auth')
export class ActivateController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activate(@Body() dto: ActivateAccountDto): Promise<void> {
    await this.commandBus.execute<ActivateAccountCommand, void>(
      new ActivateAccountCommand(dto.token, dto.password)
    );
  }
}
