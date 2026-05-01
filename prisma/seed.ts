import { PrismaClient, MarketType, Role, StrategyStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@trading.local';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcryptjs.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: { email, passwordHash, role: Role.ADMIN },
  });

  await prisma.instrument.createMany({
    data: [
      { symbol: 'XAUUSD', name: 'Gold vs US Dollar', marketType: MarketType.COMMODITY, brokerSymbol: 'XAUUSD' },
      { symbol: 'EURUSD', name: 'Euro vs US Dollar', marketType: MarketType.FOREX, brokerSymbol: 'EURUSD' },
      { symbol: 'NAS100', name: 'Nasdaq 100 Index', marketType: MarketType.INDEX, brokerSymbol: 'NAS100' },
      { symbol: 'BTCUSDT', name: 'Bitcoin vs Tether', marketType: MarketType.CRYPTO, brokerSymbol: 'BTCUSDT' },
    ],
    skipDuplicates: true,
  });

  const emaTrendStrategy = await prisma.strategy.upsert({
    where: { name: 'EMA_TREND_STRATEGY' },
    update: { status: StrategyStatus.ACTIVE },
    create: {
      id: 'ema-trend-strategy',
      name: 'EMA_TREND_STRATEGY',
      description: 'EMA alignment strategy with RSI confirmation and ATR-based exits.',
      status: StrategyStatus.ACTIVE,
    },
  });

  await prisma.strategyVersion.upsert({
    where: {
      strategyId_version: {
        strategyId: emaTrendStrategy.id,
        version: 'v1',
      },
    },
    update: { isActive: true },
    create: {
      id: 'ema-trend-strategy-v1',
      strategyId: emaTrendStrategy.id,
      version: 'v1',
      isActive: true,
      parameters: {
        rsiBuyMin: 45,
        rsiBuyMax: 70,
        rsiSellMin: 30,
        rsiSellMax: 55,
        atrStableMaxPercentOfPrice: 5,
        trendConsistencyCandles: 3,
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
