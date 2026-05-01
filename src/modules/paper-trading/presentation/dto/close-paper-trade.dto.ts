import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ClosePaperTradeDto {
  @ApiProperty({ example: 42500, minimum: 0 })
  @IsNumber()
  @Min(0)
  closePrice!: number;
}
