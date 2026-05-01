import { IsNumber, Min } from 'class-validator';

export class ClosePaperTradeDto {
  @IsNumber()
  @Min(0)
  closePrice!: number;
}
