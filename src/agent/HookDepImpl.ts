// HookDepImpl — 将 AgentDeps.hooks 桥接到模块化的 hooks 系统
// 委托到 utils/hooks/events/ 已模块化的 hook 函数

import type { HookDep, StopHookContext, StopHookResult } from '@anthropic/agent'
import type { CoreMessage } from '@anthropic/agent'
import type { ToolUseContext, Message } from '../Tool.js'
import { handleStopHooks } from '../query/stopHooks.js'

export class HookDepImpl implements HookDep {
  private toolUseContext: ToolUseContext

  constructor(toolUseContext: ToolUseContext) {
    this.toolUseContext = toolUseContext
  }

  async onTurnStart(_state: any): Promise<void> {
    // 当前无 turn start hook — 保留接口
  }

  async onTurnEnd(_state: any): Promise<void> {
    // 当前无 turn end hook — 保留接口
  }

  async onStop(messages: CoreMessage[], context: StopHookContext): Promise<StopHookResult> {
    try {
      // 委托到现有的 handleStopHooks
      const result = await handleStopHooks(
        messages as unknown as Message[],
        this.toolUseContext,
      )

      return {
        blockingErrors: result?.blockingErrors ?? [],
        preventContinuation: result?.preventContinuation ?? false,
      }
    } catch {
      // hook 出错时降级为不阻止
      return { blockingErrors: [], preventContinuation: false }
    }
  }
}
