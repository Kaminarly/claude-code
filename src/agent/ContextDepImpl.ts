// ContextDepImpl — 将 AgentDeps.context 桥接到 context.ts + systemPrompt
// 包装 prompt 构建和环境信息

import type { ContextDep, SystemPrompt } from '@anthropic/agent'
import type { ToolUseContext } from '../Tool.js'
import { getSystemContext, getUserContext } from '../context.js'

export class ContextDepImpl implements ContextDep {
  private toolUseContext: ToolUseContext

  constructor(toolUseContext: ToolUseContext) {
    this.toolUseContext = toolUseContext
  }

  getSystemPrompt(): SystemPrompt[] {
    // 从 ToolUseContext 中获取已构建的 systemPrompt
    if (this.toolUseContext.renderedSystemPrompt) {
      return [this.toolUseContext.renderedSystemPrompt as unknown as SystemPrompt]
    }
    return []
  }

  async getUserContext(): Promise<Record<string, string>> {
    try {
      return await getUserContext()
    } catch {
      return {}
    }
  }

  async getSystemContext(): Promise<Record<string, string>> {
    try {
      return await getSystemContext()
    } catch {
      return {}
    }
  }
}
