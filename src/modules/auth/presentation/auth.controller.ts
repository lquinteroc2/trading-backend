import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtUser } from './types/jwt-user.type';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './auth-cookies';
import { readCookie } from './cookie-parser';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.login(dto.email, dto.password);
    setAuthCookies(response, session, this.cookieConfig());
    return this.publicSession(session);
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      clearAuthCookies(response, this.cookieConfig());
      return this.authService.refresh('');
    }

    const session = await this.authService.refresh(refreshToken);
    setAuthCookies(response, session, this.cookieConfig());
    return this.publicSession(session);
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE));
    clearAuthCookies(response, this.cookieConfig());
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.authService.me(user.sub);
  }

  private cookieConfig() {
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>('security.cookieSameSite') ?? 'lax';
    return {
      secure: this.config.get<boolean>('security.cookieSecure') ?? false,
      sameSite,
      accessMaxAgeMs: this.config.get<number>('jwt.accessCookieMaxAgeMs') ?? 15 * 60 * 1000,
      refreshMaxAgeMs: this.config.get<number>('jwt.refreshCookieMaxAgeMs') ?? 7 * 24 * 60 * 60 * 1000,
    };
  }

  private publicSession(session: Awaited<ReturnType<AuthService['login']>>) {
    return {
      accessToken: session.accessToken,
      user: session.user,
    };
  }
}
