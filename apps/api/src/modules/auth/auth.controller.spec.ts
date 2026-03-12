import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import type { Response } from 'express';

import { IS_PUBLIC_KEY } from '../../common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    issueTokens: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  let authController: AuthController;

  beforeEach(() => {
    jest.resetAllMocks();
    configService.getOrThrow = jest.fn((key: string) => {
      if (key === 'COOKIE_SAMESITE') {
        return 'strict';
      }

      if (key === 'COOKIE_SECURE') {
        return true;
      }

      throw new Error(`Unexpected config key: ${key}`);
    });

    authController = new AuthController(authService as never, configService as never);
  });

  describe('logout', () => {
    it('clears access and refresh cookies with expected paths and options', async () => {
      const clearCookie = jest.fn();
      const response = {
        clearCookie,
      } as unknown as Response;

      await authController.logout(response);

      expect(clearCookie).toHaveBeenCalledTimes(2);
      expect(clearCookie).toHaveBeenNthCalledWith(1, 'access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
      expect(clearCookie).toHaveBeenNthCalledWith(2, 'refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth/refresh',
      });
    });

    it('is marked as a public endpoint', () => {
      const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.logout);

      expect(isPublic).toBe(true);
    });

    it('returns 204 no content', () => {
      const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.logout);

      expect(httpCode).toBe(HttpStatus.NO_CONTENT);
    });
  });
});
