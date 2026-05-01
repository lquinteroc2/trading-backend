import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CalculatePositionSizeUseCase } from '../application/calculate-position-size.use-case';
import { CalculatePositionSizeDto } from './dto/calculate-position-size.dto';

@ApiTags('risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly calculatePositionSizeUseCase: CalculatePositionSizeUseCase) {}

  @Post('calculate-position-size')
  calculate(@Body() dto: CalculatePositionSizeDto) {
    return this.calculatePositionSizeUseCase.execute(dto);
  }
}
