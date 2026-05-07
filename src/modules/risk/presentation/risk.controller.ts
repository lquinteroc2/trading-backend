import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { CalculatePositionSizeUseCase } from '../application/calculate-position-size.use-case';
import { CalculatePositionSizeDto } from './dto/calculate-position-size.dto';

@ApiTags('risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly calculatePositionSizeUseCase: CalculatePositionSizeUseCase) {}

  @Post('calculate-position-size')
  @Roles(Role.ADMIN, Role.TRADER)
  calculate(@Body() dto: CalculatePositionSizeDto) {
    return this.calculatePositionSizeUseCase.execute(dto);
  }
}
