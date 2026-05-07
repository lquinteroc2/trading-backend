import type { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'trading_access_token';
export const REFRESH_TOKEN_COOKIE = 'trading_refresh_token';

type CookieConfig = {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
};

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: CookieConfig,
) {
  response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/',
    maxAge: config.accessMaxAgeMs,
  });

  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/api/v1/auth/refresh',
    maxAge: config.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(response: Response, config: Pick<CookieConfig, 'secure' | 'sameSite'>) {
  response.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/',
  });

  response.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/api/v1/auth/refresh',
  });
}
