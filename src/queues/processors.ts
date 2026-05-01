import { Processor } from '@nestjs/bullmq';
import { LoggingProcessor } from './base.processor';
import { QUEUE_NAMES } from './queue.constants';

@Processor(QUEUE_NAMES.MARKET_DATA)
export class MarketDataProcessor extends LoggingProcessor {}

@Processor(QUEUE_NAMES.SIGNAL_GENERATION)
export class SignalGenerationProcessor extends LoggingProcessor {}

@Processor(QUEUE_NAMES.AGENT_DECISION)
export class AgentDecisionProcessor extends LoggingProcessor {}

@Processor(QUEUE_NAMES.PAPER_TRADING)
export class PaperTradingProcessor extends LoggingProcessor {}
