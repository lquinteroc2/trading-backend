import { Timeframe } from '@prisma/client';
import { AgentsController } from '@/modules/agents/presentation/agents.controller';

describe('AgentsController technical analysis endpoints', () => {
  const makeController = () => {
    const agentsService = {} as never;
    const technicalAnalyze = {
      execute: jest.fn().mockResolvedValue({
        symbol: 'BTCUSDT',
        timeframe: Timeframe.M15,
        technicalBias: 'BULLISH',
        indicators: { ema20: 10, ema50: 9, ema200: 8, rsi14: 55, atr14: 1 },
      }),
    };
    const latest = {
      execute: jest.fn().mockResolvedValue({ id: 'decision-id' }),
    };
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    return {
      controller: new AgentsController(
        agentsService,
        technicalAnalyze as never,
        latest as never,
        queue as never,
      ),
      technicalAnalyze,
      latest,
      queue,
    };
  };

  it('responds with the expected direct analysis shape', async () => {
    const { controller, technicalAnalyze } = makeController();

    const result = await controller.analyzeTechnical({
      instrumentId: '1d1ae365-2e9d-4f59-a047-158a84f7f125',
      timeframe: Timeframe.M15,
      limit: 1000,
    });

    expect(technicalAnalyze.execute).toHaveBeenCalledWith({
      instrumentId: '1d1ae365-2e9d-4f59-a047-158a84f7f125',
      timeframe: Timeframe.M15,
      limit: 1000,
    });
    expect(result).toMatchObject({
      technicalBias: 'BULLISH',
      indicators: expect.objectContaining({ ema200: 8 }),
    });
  });

  it('enqueues technical analysis jobs', async () => {
    const { controller } = makeController();

    await expect(
      controller.enqueueTechnicalAnalysis({
        instrumentId: '1d1ae365-2e9d-4f59-a047-158a84f7f125',
        timeframe: Timeframe.M15,
        limit: 1000,
      }),
    ).resolves.toEqual({ jobId: 'job-id', status: 'QUEUED' });
  });

  it('returns the latest stored technical analysis', async () => {
    const { controller, latest } = makeController();

    await expect(
      controller.getLatestTechnical({
        instrumentId: '1d1ae365-2e9d-4f59-a047-158a84f7f125',
        timeframe: Timeframe.M15,
      }),
    ).resolves.toEqual({ id: 'decision-id' });
    expect(latest.execute).toHaveBeenCalledWith(
      '1d1ae365-2e9d-4f59-a047-158a84f7f125',
      Timeframe.M15,
    );
  });
});
