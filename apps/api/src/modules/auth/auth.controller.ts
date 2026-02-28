import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { buildAuthCookieOptions } from '../../common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.user as { id: string; email: string; role: string };
    void loginDto;
    const { accessToken, refreshToken } = await this.authService.issueTokens(user);
    const cookieOptions = buildAuthCookieOptions(this.configService);

    response.cookie('access_token', accessToken, cookieOptions.accessToken);
    response.cookie('refresh_token', refreshToken, cookieOptions.refreshToken);

    return { success: true };
  }
}
