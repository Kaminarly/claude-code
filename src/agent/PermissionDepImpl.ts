// PermissionDepImpl — 将 AgentDeps.permission 桥接到 permissions pipeline
// 包装 CanUseToolFn 回调为纯 async 接口

import type { PermissionDep, CoreTool, PermissionResult, PermissionContext } from '@anthropic/agent'
import type { CanUseToolFn, ToolUseContext, Tool as RealTool, Tools } from '../Tool.js'
import { findToolByName } from '../Tool.js'

export class PermissionDepImpl implements PermissionDep {
  private canUseToolFn: CanUseToolFn
  private toolUseContext: ToolUseContext
  private tools: Tools

  constructor(canUseToolFn: CanUseToolFn, toolUseContext: ToolUseContext, tools: Tools) {
    this.canUseToolFn = canUseToolFn
    this.toolUseContext = toolUseContext
    this.tools = tools
  }

  async canUseTool(tool: CoreTool, input: unknown, context: PermissionContext): Promise<PermissionResult> {
    // 找到原始 Tool 实例
    const realTool = findToolByName(this.tools, tool.name)
    if (!realTool) {
      return { allowed: false, reason: `Unknown tool: ${tool.name}` }
    }

    try {
      const decision = await this.canUseToolFn(
        realTool,
        input as Record<string, unknown>,
        this.toolUseContext,
        { type: 'assistant', uuid: crypto.randomUUID(), message: { role: 'assistant', content: [] } } as any,
        '', // toolUseId — 在权限检查阶段尚未生成
      )

      // PermissionDecision 使用 behavior 字段，不是 decision 字段
      if (decision.behavior === 'allow') {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: decision.behavior === 'deny' ? 'Permission denied' : 'User cancelled',
      }
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
