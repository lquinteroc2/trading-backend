import { EconomicImpact } from '@prisma/client';
import { FundamentalAgentService } from '@/modules/fundamental/application/fundamental-agent.service';

describe('FundamentalAgentService', () => {
  const eventBus = {
    emit: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks when a high impact event is inside the configured window', async () => {
    const economicEvents = {
      findBlockingEvent: jest.fn(async () => ({
        id: 'event-1',
        currency: 'USD',
        title: 'FOMC Interest Rate Decision',
        impact: EconomicImpact.HIGH,
        eventTime: new Date('2026-05-05T18:00:00.000Z'),
      })),
    };
    const service = new FundamentalAgentService(economicEvents as never, eventBus as never);

    const result = await service.evaluate({
      currency: 'usd',
      timestamp: new Date('2026-05-05T17:50:00.000Z'),
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.currency).toBe('USD');
    expect(result.blockingEvent?.id).toBe('event-1');
    expect(economicEvents.findBlockingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        windowBeforeMinutes: 15,
        windowAfterMinutes: 15,
      }),
    );
  });

  it('allows when there is no high impact event inside the window', async () => {
    const economicEvents = {
      findBlockingEvent: jest.fn(async () => null),
    };
    const service = new FundamentalAgentService(economicEvents as never, eventBus as never);

    const result = await service.evaluate({
      currency: 'USD',
      timestamp: new Date('2026-05-05T17:00:00.000Z'),
    });

    expect(result.decision).toBe('ALLOW');
    expect(result.blockingEvent).toBeNull();
  });
});
