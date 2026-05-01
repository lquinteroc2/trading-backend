import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TOKENS } from '@/shared/tokens';
import { UsersRepository } from '../domain/users.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject(TOKENS.USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
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

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
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
}
