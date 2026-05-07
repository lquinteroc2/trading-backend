import {
  BrokerAction,
  BrokerConnectionStatus,
  BrokerOrderSimulationStatus,
  RiskAssessmentDecision,
  SignalDirection,
  SupervisorDecisionAction,
  SystemMode,
  TradeDirection,
} from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BrokerService } from '@/modules/broker/application/broker.service';

const order = {
  symbol: 'XAUUSD',
  direction: 'BUY' as const,
  volume: 0.01,
  entryPrice: 2320.35,
  stopLoss: 2315,
  takeProfit: 2330,
};

function decimal(value: number) {
  return { toNumber: () => value };
}

function makeService(overrides: {
  enableLiveTrading?: boolean;
  mt5DryRun?: boolean;
  killSwitch?: boolean;
  mode?: SystemMode;
  supervisorDecision?: SupervisorDecisionAction | null;
  riskDecision?: RiskAssessmentDecision | null;
} = {}) {
  const connector = {
    health: jest.fn(),
    getAccountInfo: jest.fn(),
    getSymbols: jest.fn(),
    getPrice: jest.fn(),
    dryRunOrder: jest.fn(async (request) => ({
      dryRun: true,
      wouldExecute: true,
      reason: 'Dry-run validated successfully',
      request,
    })),
    placeOrder: jest.fn(),
  };
  const prisma = {
    brokerConnectionLog: {
      create: jest.fn(async (input) => ({ id: 'log-1', ...input.data })),
    },
    brokerOrderSimulation: {
      create: jest.fn(async (input) => ({ id: 'simulation-1', ...input.data })),
    },
    tradingSignal: {
      findUnique: jest.fn(async () => ({
        id: 'signal-1',
        direction: SignalDirection.BUY,
        entryPrice: decimal(2320.35),
        stopLoss: decimal(2315),
        takeProfit: decimal(2330),
        instrument: { symbol: 'XAUUSD', brokerSymbol: null },
        supervisorDecision:
          overrides.supervisorDecision === null
            ? null
            : {
                id: 'supervisor-decision-1',
                decision: overrides.supervisorDecision ?? SupervisorDecisionAction.OPERATE,
              },
      })),
    },
    riskAssessment: {
      findFirst: jest.fn(async () =>
        overrides.riskDecision === null
          ? null
          : {
              id: 'risk-1',
              decision: overrides.riskDecision ?? RiskAssessmentDecision.APPROVED,
              positionSize: decimal(0.01),
            },
      ),
    },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'broker.provider') return 'MT5';
      if (key === 'broker.enableLiveTrading') return overrides.enableLiveTrading ?? false;
      if (key === 'mt5.dryRun') return overrides.mt5DryRun ?? true;
      return undefined;
    }),
  };
  const systemConfig = {
    getConfig: jest.fn(async () => ({
      mode: overrides.mode ?? SystemMode.PAPER_TRADING,
      killSwitch: overrides.killSwitch ?? false,
    })),
  };

  return {
    service: new BrokerService(connector as never, prisma as never, config as never, systemConfig as never),
    connector,
    prisma,
    systemConfig,
  };
}

describe('BrokerService', () => {
  it('blocks placeOrder when ENABLE_LIVE_TRADING=false and logs attempt', async () => {
    const { service, prisma, connector } = makeService({ enableLiveTrading: false });

    await expect(service.placeOrder(order)).rejects.toBeInstanceOf(ForbiddenException);

    expect(connector.placeOrder).not.toHaveBeenCalled();
    expect(prisma.brokerConnectionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: BrokerAction.PLACE_ORDER,
        status: BrokerConnectionStatus.FAILED,
        errorMessage: 'Live trading is disabled',
      }),
    });
  });

  it('blocks placeOrder when killSwitch=true', async () => {
    const { service, prisma } = makeService({
      enableLiveTrading: true,
      mt5DryRun: false,
      killSwitch: true,
    });

    await expect(service.placeOrder(order)).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.brokerConnectionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ errorMessage: 'Kill switch is enabled' }),
    });
  });

  it('dry-run from signal fails without supervisor OPERATE', async () => {
    const { service } = makeService({ supervisorDecision: SupervisorDecisionAction.WAIT });

    await expect(service.dryRunOrderFromSignal('signal-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('dry-run from signal works with risk and supervisor approvals', async () => {
    const { service, connector, prisma } = makeService();

    const response = await service.dryRunOrderFromSignal('signal-1');

    expect(response.wouldExecute).toBe(true);
    expect(connector.dryRunOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'XAUUSD',
        direction: TradeDirection.BUY,
        volume: 0.01,
        comment: 'INVERSIONES_DRY_RUN',
      }),
    );
    expect(prisma.brokerOrderSimulation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signalId: 'signal-1',
        supervisorDecisionId: 'supervisor-decision-1',
        status: BrokerOrderSimulationStatus.VALIDATED,
        dryRun: true,
      }),
    });
  });

  it('saves logs for successful dry-run connector call', async () => {
    const { service, prisma } = makeService();

    await service.dryRunOrder(order);

    expect(prisma.brokerConnectionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'MT5',
        action: BrokerAction.DRY_RUN_ORDER,
        status: BrokerConnectionStatus.SUCCESS,
      }),
    });
  });
});
