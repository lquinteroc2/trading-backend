import { PartialType } from '@nestjs/swagger';
import { CreateEconomicEventDto } from './create-economic-event.dto';

export class UpdateEconomicEventDto extends PartialType(CreateEconomicEventDto) {}
