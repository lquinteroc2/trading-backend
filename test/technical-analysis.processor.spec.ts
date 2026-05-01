import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { AgentDecisionAction, Timeframe } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';
import { TechnicalAnalysisProcessor } from '@/modules/agents/infrastructure/technical-analysis.processor';

describe('TechnicalAnalysisProcessor', () => {
  const job = {
    id: 'job-id',
    name: 'technical-analysis.analyze',
    attemptsMade: 0,
    data: {
      instrumentId: 'instrument-id',
      symbol: 'BTCUSDT',
      timeframe: Timeframe.M15,
      candleTimestamp: '2024-01-01T00:00:00.000Z',
      executionSource: 'QUEUE',
    },
  };

  it('fails without retry when there are not enough candles', async () => {
    const useCase = {
      execute: jest.fn().mockRejectedValue(new BadRequestException('Not enough candles')),
    };
    const processor = new TechnicalAnalysisProcessor(useCase as never);

    await expect(processor.process(job as never)).rejects.toThrow(UnrecoverableError);
  });

  it('retries provider HTTP failures', async () => {
    const useCase = {
      execute: jest.fn().mockRejectedValue(new BadGatewayException('worker unavailable')),
    };
    const processor = new TechnicalAnalysisProcessor(useCase as never);

    await expect(processor.process(job as never)).rejects.toThrow(BadGatewayException);
  });

  it('calls the technical use case and returns the saved decision', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({
        agentDecisionId: 'decision-id',
        decision: AgentDecisionAction.APPROVE,
        confidenceScore: 80,
      }),
    };
    const processor = new TechnicalAnalysisProcessor(useCase as never);

    await expect(processor.process(job as never)).resolves.toMatchObject({
      agentDecisionId: 'decision-id',
      decision: AgentDecisionAction.APPROVE,
    });
    expect(useCase.execute).toHaveBeenCalledWith({
      instrumentId: 'instrument-id',
      timeframe: Timeframe.M15,
      limit: undefined,
      executionSource: 'QUEUE',
    });
  });
});
