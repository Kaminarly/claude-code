// query.ts — 核心消息循环入口
// 委托到 packages/agent 的 AgentCore，通过适配器层桥接现有实现

import type { CanUseToolFn } from './hooks/useCanUseTool.js'
import type { ToolUseContext } from './Tool.js'
import type { SystemPrompt } from './utils/systemPromptType.js'
import type {
  Message,
  RequestStartEvent,
  StreamEvent,
  ToolUseSummaryMessage,
  TombstoneMessage,
} from './types/message.js'
import type { QuerySource } from './constants/querySource.js'
import type { QueryDeps } from './query/deps.js'
import type { Terminal } from './query/transitions.js'

import { AgentCore } from '@anthropic/agent'
import type { AgentInput } from '@anthropic/agent'
import { createProductionDeps, toCoreMessages, fromAgentEvent } from './agent/createDeps.js'

export type QueryParams = {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  canUseTool: CanUseToolFn
  toolUseContext: ToolUseContext
  fallbackModel?: string
  querySource: QuerySource
  maxOutputTokensOverride?: number
  maxTurns?: number
  skipCacheWrite?: boolean
  taskBudget?: { total: number }
  deps?: QueryDeps
}

export async function* query(
  params: QueryParams,
): AsyncGenerator<
  | StreamEvent
  | RequestStartEvent
  | Message
  | TombstoneMessage
  | ToolUseSummaryMessage,
  Terminal
> {
  // 构建 AgentDeps — 桥接现有 services 到 AgentCore 接口
  const deps = createProductionDeps({
    tools: params.toolUseContext.options.tools,
    toolUseContext: params.toolUseContext,
    canUseTool: params.canUseTool,
    querySource: params.querySource,
  })

  const agent = new AgentCore(deps)

  const input: AgentInput = {
    messages: toCoreMessages(params.messages),
    abortSignal: params.toolUseContext.abortController.signal,
    maxTurns: params.maxTurns,
    tokenBudget: params.taskBudget?.total ?? null,
  }

  for await (const event of agent.run(input)) {
    const converted = fromAgentEvent(event)
    if (converted !== undefined) {
      yield converted
    }
  }

  return { type: 'terminal', reason: 'end_turn' }
}
