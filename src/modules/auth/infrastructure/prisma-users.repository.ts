import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UserEntity } from '../domain/user.entity';
import { UsersRepository } from '../domain/users.repository';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user
      ? new UserEntity(
          user.id,
          user.email,
          user.passwordHash,
          user.role,
          user.isActive,
          user.createdAt,
          user.updatedAt,
        )
      : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user
      ? new UserEntity(
          user.id,
          user.email,
          user.passwordHash,
          user.role,
          user.isActive,
          user.createdAt,
          user.updatedAt,
        )
      : null;
  }
}
