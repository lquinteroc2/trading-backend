import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TOKENS } from '@/shared/tokens';
import { AuthService } from './application/auth.service';
import { PrismaUsersRepository } from './infrastructure/prisma-users.repository';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AuthController } from './presentation/auth.controller';
import { RolesGuard } from './presentation/guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') ?? '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    { provide: TOKENS.USERS_REPOSITORY, useClass: PrismaUsersRepository },
  ],
  exports: [AuthService, JwtModule, RolesGuard],
})
export class AuthModule {}
