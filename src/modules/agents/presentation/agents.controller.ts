import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '@/queues/queue.constants';
import { AgentsService } from '../application/agents.service';
import { GetLatestTechnicalAnalysisUseCase } from '../application/get-latest-technical-analysis.use-case';
import { TechnicalAnalyzeUseCase } from '../application/technical-analyze.use-case';
import { TechnicalAnalysisJobPayload } from '../infrastructure/technical-analysis.processor';
import { AnalyzeTechnicalDto } from './dto/analyze-technical.dto';
import { CreateAgentDecisionDto } from './dto/create-agent-decision.dto';
import { LatestTechnicalAnalysisDto } from './dto/latest-technical-analysis.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly technicalAnalyze: TechnicalAnalyzeUseCase,
    private readonly getLatestTechnicalAnalysis: GetLatestTechnicalAnalysisUseCase,
    @InjectQueue(QUEUE_NAMES.TECHNICAL_ANALYSIS)
    private readonly technicalAnalysisQueue: Queue<TechnicalAnalysisJobPayload>,
  ) {}

  @Post('technical/analyze')
  analyzeTechnical(@Body() dto: AnalyzeTechnicalDto) {
    return this.technicalAnalyze.execute(dto);
  }

  @Post('technical/analyze/enqueue')
  async enqueueTechnicalAnalysis(@Body() dto: AnalyzeTechnicalDto) {
    const job = await this.technicalAnalysisQueue.add(QUEUE_JOBS.TECHNICAL_ANALYSIS_ANALYZE, dto);
    return { jobId: job.id, status: 'QUEUED' };
  }

  @Get('technical/latest')
  getLatestTechnical(@Query() query: LatestTechnicalAnalysisDto) {
    return this.getLatestTechnicalAnalysis.execute(query.instrumentId, query.timeframe);
  }

  @Post('decisions')
  create(@Body() dto: CreateAgentDecisionDto) {
    return this.agentsService.createDecision(dto);
  }

  @Get('decisions')
  findMany() {
    return this.agentsService.findDecisions();
  }

  @Get('decisions/:id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findDecisionById(id);
  }
}
