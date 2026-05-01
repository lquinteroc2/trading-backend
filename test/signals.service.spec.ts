import { NotFoundException } from '@nestjs/common';
import { SignalDirection, SignalStatus, SourceAgent } from '@prisma/client';
import { SignalsService } from '@/modules/signals/application/signals.service';
import { TradingSignalsRepository } from '@/modules/signals/domain/trading-signals.repository';

describe('SignalsService', () => {
  const signal = {
    id: 'signal-id',
    instrumentId: 'instrument-id',
    direction: SignalDirection.BUY,
    entryPrice: 2000,
    stopLoss: 1990,
    takeProfit: 2020,
    confidenceScore: 80,
    status: SignalStatus.PENDING,
    sourceAgent: SourceAgent.TECHNICAL,
    reasoning: 'Trend continuation',
    createdAt: new Date(),
    expiresAt: null,
  };

  const repository = (): jest.Mocked<TradingSignalsRepository> => ({
    create: jest.fn().mockResolvedValue(signal),
    findMany: jest.fn().mockResolvedValue([signal]),
    findById: jest.fn().mockResolvedValue(signal),
    findByCandleKey: jest.fn().mockResolvedValue(signal),
    updateStatus: jest.fn().mockResolvedValue({ ...signal, status: SignalStatus.APPROVED }),
  });

  it('creates a signal through repository', async () => {
    const repo = repository();
    const service = new SignalsService(repo);

    await service.create({
      instrumentId: signal.instrumentId,
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      confidenceScore: signal.confidenceScore,
      sourceAgent: signal.sourceAgent,
    });

    expect(repo.create).toHaveBeenCalled();
  });

  it('updates signal status after checking existence', async () => {
    const repo = repository();
    const service = new SignalsService(repo);

    const result = await service.updateStatus(signal.id, SignalStatus.APPROVED);

    expect(repo.findById).toHaveBeenCalledWith(signal.id);
    expect(result.status).toBe(SignalStatus.APPROVED);
  });

  it('throws when signal does not exist', async () => {
    const repo = repository();
    repo.findById.mockResolvedValue(null);
    const service = new SignalsService(repo);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
