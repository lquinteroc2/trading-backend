import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaperTradeResult, PaperTradeStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindPaperTradesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instrumentId?: string;

  @ApiPropertyOptional({ enum: PaperTradeStatus })
  @IsOptional()
  @IsEnum(PaperTradeStatus)
  status?: PaperTradeStatus;

  @ApiPropertyOptional({ enum: PaperTradeResult })
  @IsOptional()
  @IsEnum(PaperTradeResult)
  result?: PaperTradeResult;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
