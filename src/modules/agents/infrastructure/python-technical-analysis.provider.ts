import { BadGatewayException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timeframe } from '@prisma/client';
import { getCloudRunIdentityToken } from '../../../common/http/google-cloud-run-auth';
import {
  AnalyzeCandlesParams,
  TechnicalAnalysisProvider,
  TechnicalAnalysisResult,
} from '../domain/technical-analysis-provider.interface';

type WorkerTechnicalAnalysisResponse = Omit<TechnicalAnalysisResult, 'timeframe'> & {
  timeframe: string;
  primaryTimeframe?: string;
};

@Injectable()
export class PythonTechnicalAnalysisProvider implements TechnicalAnalysisProvider {
  private readonly baseUrl: string;
  private readonly authAudience?: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('technicalAgent.baseUrl') ?? 'http://localhost:8000';
    this.authAudience = this.config.get<string>('technicalAgent.authAudience');
    this.timeoutMs = this.config.get<number>('technicalAgent.timeoutMs') ?? 8000;
  }

  async analyzeCandles(params: AnalyzeCandlesParams): Promise<TechnicalAnalysisResult> {
    let response: Response;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.authAudience) {
        headers.Authorization = `Bearer ${await getCloudRunIdentityToken(this.authAudience)}`;
      }

      response = await fetch(`${this.baseUrl}/technical-analysis/analyze`, {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          symbol: params.symbol,
          timeframe: params.timeframe,
          primaryTimeframe: params.primaryTimeframe ?? params.timeframe,
          candles: this.serializeCandles(params.candles),
          timeframes: params.timeframes
            ? Object.fromEntries(
                Object.entries(params.timeframes).map(([timeframe, candles]) => [
                  timeframe,
                  this.serializeCandles(candles ?? []),
                ]),
              )
            : undefined,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          `Technical agent worker timed out after ${this.timeoutMs}ms at ${this.baseUrl}`,
        );
      }
      throw new BadGatewayException(
        `Technical agent worker is unreachable at ${this.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(
        `Technical agent worker returned ${response.status}: ${body.slice(0, 300)}`,
      );
    }

    let payload: WorkerTechnicalAnalysisResponse;
    try {
      payload = (await response.json()) as WorkerTechnicalAnalysisResponse;
    } catch (error) {
      throw new BadGatewayException(
        `Technical agent worker returned invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return {
      ...payload,
      timeframe: payload.timeframe as Timeframe,
      primaryTimeframe: (payload.primaryTimeframe ?? payload.timeframe) as Timeframe,
      multiTimeframe: payload.multiTimeframe
        ? {
            ...payload.multiTimeframe,
            primary: payload.multiTimeframe.primary as Timeframe,
            confirmationTimeframes: payload.multiTimeframe.confirmationTimeframes as Timeframe[],
            biasByTimeframe: payload.multiTimeframe.biasByTimeframe as Partial<
              Record<Timeframe, 'BULLISH' | 'BEARISH' | 'NEUTRAL'>
            >,
          }
        : undefined,
    };
  }

  private serializeCandles(candles: AnalyzeCandlesParams['candles']) {
    return candles.map((candle) => ({
      timestamp: candle.timestamp.toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
  }
}
