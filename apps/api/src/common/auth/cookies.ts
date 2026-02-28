import type { CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';

export type AuthCookieOptions = {
  accessToken: CookieOptions;
  refreshToken: CookieOptions;
};

export const buildAuthCookieOptions = (
  configService: ConfigService,
): AuthCookieOptions => {
  const sameSite = configService.getOrThrow<'none' | 'strict'>('COOKIE_SAMESITE');
  const secure = configService.getOrThrow<boolean>('COOKIE_SECURE');

  return {
    accessToken: {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    },
    refreshToken: {
      httpOnly: true,
      secure,
      sameSite,
      path: '/auth/refresh',
    },
  };
};
