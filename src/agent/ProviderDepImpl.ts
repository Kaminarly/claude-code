// ProviderDepImpl — 将 AgentDeps.provider 桥接到 ProviderRegistry
// 直接委托到 services/api/claude.ts 的 queryModel()，复用完整的 API 调用链

import type { ProviderDep, ProviderStreamParams, ProviderEvent } from '@anthropic/agent'
import type { ToolUseContext, Tools } from '../Tool.js'
import type { Message } from '../types/message.js'

export class ProviderDepImpl implements ProviderDep {
  private toolUseContext: ToolUseContext
  private querySource?: string

  constructor(toolUseContext: ToolUseContext, querySource?: string) {
    this.toolUseContext = toolUseContext
    this.querySource = querySource
  }

  async *stream(params: ProviderStreamParams): AsyncGenerator<ProviderEvent> {
    const { queryModel } = await import('../services/api/claude.js')
    const ctx = this.toolUseContext

    const systemPrompt = ctx.renderedSystemPrompt ?? params.systemPrompt
    const tools = (ctx.options.tools ?? []) as unknown as Tools
    const appState = ctx.getAppState?.()

    // 构造完整 options — 与原 query.ts 中 queryModelWithStreaming 的 options 对齐
    // 关键字段：getToolPermissionContext、agents、allowedAgentTypes 等
    const options: Record<string, unknown> = {
      ...ctx.options,
      // 覆盖 model（来自 AgentLoop 的 provider.getModel()）
      model: params.model ?? ctx.options.mainLoopModel,
      // querySource 从创建时传入或从 options 继承
      querySource: this.querySource ?? (ctx.options as any).querySource ?? 'repl_main_thread',
    }

    // getToolPermissionContext — queryModel -> toolToAPISchema -> tool.prompt() 需要
    if (!options.getToolPermissionContext && appState) {
      options.getToolPermissionContext = async () => appState.toolPermissionContext
    }

    // agents / allowedAgentTypes — toolToAPISchema 传给 AgentTool.prompt()
    if (!options.agents && ctx.options.agentDefinitions) {
      options.agents = ctx.options.agentDefinitions.activeAgents
    }
    if (!options.allowedAgentTypes && ctx.options.agentDefinitions) {
      options.allowedAgentTypes = ctx.options.agentDefinitions.allowedAgentTypes
    }

    // mcpTools / hasPendingMcpServers — tool search / deferred tools 需要
    if (appState) {
      if (!options.mcpTools) options.mcpTools = appState.mcp?.tools
      if (!options.hasPendingMcpServers) {
        options.hasPendingMcpServers = appState.mcp?.clients?.some(
          (c: any) => c.type === 'pending',
        )
      }
    }

    const stream = queryModel(
      params.messages as Message[],
      systemPrompt as any,
      ctx.options.thinkingConfig,
      tools,
      params.abortSignal ?? ctx.abortController.signal,
      options as any,
    )

    for await (const event of stream) {
      yield event as unknown as ProviderEvent
    }
  }

  getModel(): string {
    return this.toolUseContext.options.mainLoopModel
  }
}
