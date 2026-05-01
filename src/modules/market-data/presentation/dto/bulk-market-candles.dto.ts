import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateMarketCandleDto } from './create-market-candle.dto';

export class BulkMarketCandlesDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMarketCandleDto)
  candles!: CreateMarketCandleDto[];
}
