import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateMarketCandleDto } from './create-market-candle.dto';

export class BulkMarketCandlesDto {
  @ApiProperty({ type: [CreateMarketCandleDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMarketCandleDto)
  candles!: CreateMarketCandleDto[];
}
