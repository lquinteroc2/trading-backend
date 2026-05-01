import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import {
  AnalyzeCandlesParams,
  TechnicalAnalysisProvider,
  TechnicalAnalysisResult,
} from '../domain/technical-analysis-provider.interface';

type WorkerTechnicalAnalysisResponse = Omit<TechnicalAnalysisResult, 'timeframe'> & {
  timeframe: string;
};

@Injectable()
export class PythonTechnicalAnalysisProvider implements TechnicalAnalysisProvider {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('technicalAgent.baseUrl') ?? 'http://localhost:8000';
  }

  async analyzeCandles(params: AnalyzeCandlesParams): Promise<TechnicalAnalysisResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/technical-analysis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: params.symbol,
          timeframe: params.timeframe,
          candles: params.candles.map((candle) => ({
            timestamp: candle.timestamp.toISOString(),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          })),
        }),
      });
    } catch (error) {
      throw new BadGatewayException(
        `Technical agent worker is unreachable at ${this.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(
        `Technical agent worker returned ${response.status}: ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as WorkerTechnicalAnalysisResponse;
    return { ...payload, timeframe: payload.timeframe as Timeframe };
  }
}
