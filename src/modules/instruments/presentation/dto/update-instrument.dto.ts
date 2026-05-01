import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateInstrumentDto } from './create-instrument.dto';

export class UpdateInstrumentDto extends PartialType(CreateInstrumentDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
