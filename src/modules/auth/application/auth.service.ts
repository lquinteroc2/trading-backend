import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/database/prisma.service';
import { TOKENS } from '@/shared/tokens';
import { UsersRepository } from '../domain/users.repository';
import { JwtUser } from '../presentation/types/jwt-user.type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(TOKENS.USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = await this.createRefreshSession(payload);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid session');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtUser & { jti?: string; tokenType?: string }>(
        refreshToken,
        {
        secret: this.config.get<string>('jwt.refreshSecret'),
        },
      );

      if (payload.tokenType !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const storedToken = await this.prisma.authRefreshToken.findUnique({
        where: { id: payload.jti },
      });
      const now = new Date();
      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= now) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const validTokenHash = await bcrypt.compare(refreshToken, storedToken.tokenHash);
      if (!validTokenHash) {
        await this.revokeRefreshToken(storedToken.id);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid session');
      }

      const tokens = await this.createRefreshSession(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        storedToken.id,
      );

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;

    try {
      const payload = await this.jwtService.verifyAsync<JwtUser & { jti?: string; tokenType?: string }>(
        refreshToken,
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          ignoreExpiration: true,
        },
      );

      if (payload.tokenType === 'refresh' && payload.jti) {
        await this.revokeRefreshToken(payload.jti);
      }
    } catch {
      return;
    }
  }

  private async createRefreshSession(payload: JwtUser, previousRefreshTokenId?: string) {
    const refreshTokenId = randomUUID();
    const tokens = await this.signTokens(payload, refreshTokenId);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const refreshMaxAgeMs = this.config.get<number>('jwt.refreshCookieMaxAgeMs') ?? 7 * 24 * 60 * 60 * 1000;

    await this.prisma.authRefreshToken.create({
      data: {
        id: refreshTokenId,
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshMaxAgeMs),
      },
    });

    if (previousRefreshTokenId) {
      await this.prisma.authRefreshToken.updateMany({
        where: { id: previousRefreshTokenId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: refreshTokenId,
        },
      });
    }

    return tokens;
  }

  private async signTokens(payload: JwtUser, refreshTokenId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      }),
      this.jwtService.signAsync(
        { ...payload, jti: refreshTokenId, tokenType: 'refresh' },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async revokeRefreshToken(refreshTokenId: string) {
    await this.prisma.authRefreshToken.updateMany({
      where: { id: refreshTokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
