import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TOKENS } from '@/shared/tokens';
import {
  CreateInstrumentData,
  InstrumentsRepository,
  UpdateInstrumentData,
} from '../domain/instruments.repository';

@Injectable()
export class InstrumentsService {
  constructor(
    @Inject(TOKENS.INSTRUMENTS_REPOSITORY)
    private readonly instrumentsRepository: InstrumentsRepository,
  ) {}

  async create(data: CreateInstrumentData) {
    const existing = await this.instrumentsRepository.findBySymbol(data.symbol);
    if (existing) {
      throw new ConflictException('Instrument symbol already exists');
    }
    return this.instrumentsRepository.create({ ...data, symbol: data.symbol.toUpperCase() });
  }

  findAll() {
    return this.instrumentsRepository.findAll();
  }

  async findById(id: string) {
    const instrument = await this.instrumentsRepository.findById(id);
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }
    return instrument;
  }

  async update(id: string, data: UpdateInstrumentData) {
    await this.findById(id);
    if (data.symbol) {
      const existing = await this.instrumentsRepository.findBySymbol(data.symbol.toUpperCase());
      if (existing && existing.id !== id) {
        throw new ConflictException('Instrument symbol already exists');
      }
    }
    return this.instrumentsRepository.update(id, {
      ...data,
      symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.instrumentsRepository.deactivate(id);
  }
}
