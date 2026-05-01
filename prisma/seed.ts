import { PrismaClient, MarketType, Role } from '@prisma/client';
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
