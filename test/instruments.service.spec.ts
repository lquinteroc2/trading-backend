import { ConflictException, NotFoundException } from '@nestjs/common';
import { MarketType } from '@prisma/client';
import { InstrumentsService } from '@/modules/instruments/application/instruments.service';
import { InstrumentsRepository } from '@/modules/instruments/domain/instruments.repository';

describe('InstrumentsService', () => {
  const baseInstrument = {
    id: 'instrument-id',
    symbol: 'XAUUSD',
    name: 'Gold',
    marketType: MarketType.COMMODITY,
    brokerSymbol: 'XAUUSD',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const repository = (): jest.Mocked<InstrumentsRepository> => ({
    create: jest.fn().mockResolvedValue(baseInstrument),
    findAll: jest.fn().mockResolvedValue([baseInstrument]),
    findById: jest.fn().mockResolvedValue(baseInstrument),
    findBySymbol: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(baseInstrument),
    deactivate: jest.fn().mockResolvedValue({ ...baseInstrument, isActive: false }),
  });

  it('creates an instrument with uppercase symbol', async () => {
    const repo = repository();
    const service = new InstrumentsService(repo);

    await service.create({
      symbol: 'xauusd',
      name: 'Gold',
      marketType: MarketType.COMMODITY,
      brokerSymbol: 'XAUUSD',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'XAUUSD',
      }),
    );
  });

  it('rejects duplicated symbols', async () => {
    const repo = repository();
    repo.findBySymbol.mockResolvedValue(baseInstrument);
    const service = new InstrumentsService(repo);

    await expect(
      service.create({
        symbol: 'XAUUSD',
        name: 'Gold',
        marketType: MarketType.COMMODITY,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws when instrument is missing', async () => {
    const repo = repository();
    repo.findById.mockResolvedValue(null);
    const service = new InstrumentsService(repo);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
