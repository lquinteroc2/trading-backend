import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OpenPaperTradeDto {
  @ApiProperty({ example: 'SIGNAL_ID' })
  @IsString()
  signalId!: string;

  @ApiPropertyOptional({ example: 'PAPER_ACCOUNT_ID' })
  @IsOptional()
  @IsString()
  accountId?: string;
}
