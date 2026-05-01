import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaperAccountDto {
  @ApiProperty({ example: 'DEFAULT_PAPER_ACCOUNT' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 10000, minimum: 0 })
  @IsNumber()
  @Min(0)
  initialBalance!: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}
