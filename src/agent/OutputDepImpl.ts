// OutputDepImpl — 将 AgentDeps.output 桥接到主包的输出目标
// 默认 no-op 模式，REPL 可传入 Ink 渲染回调

import type { OutputDep } from '@anthropic/agent'
import type { ToolUseContext } from '../Tool.js'

export class OutputDepImpl implements OutputDep {
  private emitFn?: (event: unknown) => void

  constructor(toolUseContext?: ToolUseContext, emitFn?: (event: unknown) => void) {
    this.emitFn = emitFn
  }

  emit(event: unknown): void {
    this.emitFn?.(event)
  }
}
