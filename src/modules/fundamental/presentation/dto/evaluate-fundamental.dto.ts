import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class EvaluateFundamentalDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(3)
  @MaxLength(12)
  currency!: string;

  @ApiProperty({ example: '2026-05-05T17:50:00.000Z' })
  @IsDateString()
  timestamp!: string;
}
