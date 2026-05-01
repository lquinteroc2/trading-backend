import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { InstrumentEntity } from '../domain/instrument.entity';
import {
  CreateInstrumentData,
  InstrumentsRepository,
  UpdateInstrumentData,
} from '../domain/instruments.repository';

@Injectable()
export class PrismaInstrumentsRepository implements InstrumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInstrumentData): Promise<InstrumentEntity> {
    return this.toEntity(await this.prisma.instrument.create({ data }));
  }

  async findAll(): Promise<InstrumentEntity[]> {
    const instruments = await this.prisma.instrument.findMany({ orderBy: { symbol: 'asc' } });
    return instruments.map((instrument) => this.toEntity(instrument));
  }

  async findById(id: string): Promise<InstrumentEntity | null> {
    const instrument = await this.prisma.instrument.findUnique({ where: { id } });
    return instrument ? this.toEntity(instrument) : null;
  }

  async findBySymbol(symbol: string): Promise<InstrumentEntity | null> {
    const instrument = await this.prisma.instrument.findUnique({ where: { symbol } });
    return instrument ? this.toEntity(instrument) : null;
  }

  async update(id: string, data: UpdateInstrumentData): Promise<InstrumentEntity> {
    return this.toEntity(await this.prisma.instrument.update({ where: { id }, data }));
  }

  async deactivate(id: string): Promise<InstrumentEntity> {
    return this.toEntity(
      await this.prisma.instrument.update({ where: { id }, data: { isActive: false } }),
    );
  }

  private toEntity(instrument: {
    id: string;
    symbol: string;
    name: string;
    marketType: InstrumentEntity['marketType'];
    brokerSymbol: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return new InstrumentEntity(
      instrument.id,
      instrument.symbol,
      instrument.name,
      instrument.marketType,
      instrument.brokerSymbol,
      instrument.isActive,
      instrument.createdAt,
      instrument.updatedAt,
    );
  }
}
