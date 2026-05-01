import { ApiProperty } from '@nestjs/swagger';
import { PaperTradeCloseReason } from '@prisma/client';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class ClosePaperTradeDto {
  @ApiProperty({ example: 42500, minimum: 0 })
  @IsNumber()
  @Min(0)
  closePrice!: number;

  @ApiProperty({ enum: PaperTradeCloseReason, example: PaperTradeCloseReason.MANUAL })
  @IsEnum(PaperTradeCloseReason)
  closeReason!: PaperTradeCloseReason;
}
