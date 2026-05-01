import { SignalDirection, SignalStatus, SourceAgent } from '@prisma/client';

export class TradingSignalEntity {
  constructor(
    public readonly id: string,
    public readonly instrumentId: string,
    public readonly direction: SignalDirection,
    public readonly entryPrice: number,
    public readonly stopLoss: number | null,
    public readonly takeProfit: number | null,
    public readonly confidenceScore: number,
    public readonly status: SignalStatus,
    public readonly sourceAgent: SourceAgent,
    public readonly reasoning: string | null,
    public readonly createdAt: Date,
    public readonly expiresAt: Date | null,
  ) {}
}
