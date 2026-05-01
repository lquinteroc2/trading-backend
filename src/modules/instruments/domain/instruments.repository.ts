import { MarketType } from '@prisma/client';
import { InstrumentEntity } from './instrument.entity';

export type CreateInstrumentData = {
  symbol: string;
  name: string;
  marketType: MarketType;
  brokerSymbol?: string;
};

export type UpdateInstrumentData = Partial<CreateInstrumentData> & { isActive?: boolean };

export interface InstrumentsRepository {
  create(data: CreateInstrumentData): Promise<InstrumentEntity>;
  findAll(): Promise<InstrumentEntity[]>;
  findById(id: string): Promise<InstrumentEntity | null>;
  findBySymbol(symbol: string): Promise<InstrumentEntity | null>;
  update(id: string, data: UpdateInstrumentData): Promise<InstrumentEntity>;
  deactivate(id: string): Promise<InstrumentEntity>;
}
