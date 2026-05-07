import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TechnicalAnalysisQueueProducer } from '@/queues/technical-analysis-queue.producer';
import { Roles } from '@/modules/auth/presentation/decorators/roles.decorator';
import { AgentsService } from '../application/agents.service';
import { GetLatestTechnicalAnalysisUseCase } from '../application/get-latest-technical-analysis.use-case';
import { TechnicalAnalyzeUseCase } from '../application/technical-analyze.use-case';
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
    private readonly technicalAnalysisQueueProducer: TechnicalAnalysisQueueProducer,
  ) {}

  @Post('technical/analyze')
  @Roles(Role.ADMIN, Role.TRADER)
  analyzeTechnical(@Body() dto: AnalyzeTechnicalDto) {
    return this.technicalAnalyze.execute(dto);
  }

  @Post('technical/analyze/enqueue')
  @Roles(Role.ADMIN, Role.TRADER)
  async enqueueTechnicalAnalysis(@Body() dto: AnalyzeTechnicalDto) {
    const timeframe = dto.primaryTimeframe ?? dto.timeframe;
    if (!timeframe) {
      throw new BadRequestException('timeframe or primaryTimeframe is required');
    }
    return this.technicalAnalysisQueueProducer.enqueueTechnicalAnalysis({
      ...dto,
      timeframe,
      executionSource: 'MANUAL',
      force: true,
    });
  }

  @Get('technical/latest')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  getLatestTechnical(@Query() query: LatestTechnicalAnalysisDto) {
    return this.getLatestTechnicalAnalysis.execute(query.instrumentId, query.timeframe);
  }

  @Post('decisions')
  @Roles(Role.ADMIN, Role.TRADER)
  create(@Body() dto: CreateAgentDecisionDto) {
    return this.agentsService.createDecision(dto);
  }

  @Get('decisions')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findMany() {
    return this.agentsService.findDecisions();
  }

  @Get('decisions/:id')
  @Roles(Role.ADMIN, Role.TRADER, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.agentsService.findDecisionById(id);
  }
}
