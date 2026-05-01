export type PaperTradeOpenJobPayload = {
  signalId: string;
  accountId?: string;
};

export type PaperTradeEvaluateOpenTradesJobPayload = {
  candleId: string;
};

export type PaperTradingJobPayload =
  | PaperTradeOpenJobPayload
  | PaperTradeEvaluateOpenTradesJobPayload;
