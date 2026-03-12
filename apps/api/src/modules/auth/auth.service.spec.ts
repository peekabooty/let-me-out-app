import { UnauthorizedException } from '@nestjs/common';
import { Theme } from '@repo/types';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtService: Pick<JwtService, 'signAsync' | 'verifyAsync'> = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  const prismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const authService = new AuthService(
    prismaService as never,
    jwtService as never,
    configService as never
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('issueTokens', () => {
    it('returns access and refresh tokens', async () => {
      jwtService.signAsync = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      configService.getOrThrow = jest.fn().mockReturnValue('refresh-secret');

      const result = await authService.issueTokens({
        id: 'user-id',
        email: 'user@example.com',
        role: 'standard',
        name: 'User',
        isActive: true,
      });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshAccessToken', () => {
    it('returns a new access token for valid refresh token', async () => {
      configService.getOrThrow = jest.fn().mockReturnValue('refresh-secret');
      jwtService.verifyAsync = jest.fn().mockResolvedValue({ userId: 'user-id' });
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        role: 'standard',
        is_active: true,
      });
      jwtService.signAsync = jest.fn().mockResolvedValue('new-access-token');

      const result = await authService.refreshAccessToken('refresh-token');

      expect(result).toBe('new-access-token');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
        secret: 'refresh-secret',
      });
    });

    it('throws UnauthorizedException for invalid refresh token', async () => {
      configService.getOrThrow = jest.fn().mockReturnValue('refresh-secret');
      jwtService.verifyAsync = jest.fn().mockRejectedValue(new Error('invalid'));

      await expect(authService.refreshAccessToken('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });

  describe('getProfile', () => {
    it('returns profile with themePreference and camelCase fields', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'User Name',
        role: 'standard',
        is_active: true,
        theme_preference: 'dark',
      });

      const profile = await authService.getProfile('user-id');

      expect(profile).toEqual({
        id: 'user-id',
        email: 'user@example.com',
        name: 'User Name',
        role: 'standard',
        isActive: true,
        themePreference: Theme.DARK,
      });
    });

    it('defaults themePreference to light when null', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'User Name',
        role: 'standard',
        is_active: true,
        theme_preference: null,
      });

      const profile = await authService.getProfile('user-id');

      expect(profile.themePreference).toBe(Theme.LIGHT);
    });
  });
});
