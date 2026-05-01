import { AgentDecisionEntity } from './agent-decision.entity';

export interface IAgent<TInput = unknown> {
  decide(input: TInput): Promise<AgentDecisionEntity>;
}

export interface ITechnicalAgent<TInput = unknown> extends IAgent<TInput> {}
export interface IFundamentalAgent<TInput = unknown> extends IAgent<TInput> {}
export interface IRiskAgent<TInput = unknown> extends IAgent<TInput> {}
export interface IExecutionAgent<TInput = unknown> extends IAgent<TInput> {}
export interface ISupervisorAgent<TInput = unknown> extends IAgent<TInput> {}
