// AgentCore — 消费者的入口类
// 持有 AgentDeps，管理 AgentState，提供 run/interrupt/getMessages 等 API

import type { AgentDeps } from '../types/deps.js'
import type { AgentEvent, DoneReason } from '../types/events.js'
import type { AgentState, AgentInput } from '../types/state.js'
import type { CoreMessage, Usage } from '../types/messages.js'
import { AgentLoop } from './AgentLoop.js'

export class AgentCore {
  private loop: AgentLoop
  private _messages: CoreMessage[]
  private _turnCount: number
  private _totalUsage: Usage
  private _model: string
  private _sessionId: string
  private _interrupted: boolean

  constructor(
    private deps: AgentDeps,
    initialState?: Partial<AgentState>,
  ) {
    this._messages = initialState?.messages ? [...initialState.messages] : []
    this._turnCount = initialState?.turnCount ?? 0
    this._totalUsage = initialState?.totalUsage ?? {
      input_tokens: 0,
      output_tokens: 0,
    }
    this._model = initialState?.model ?? deps.provider.getModel()
    this._sessionId = initialState?.sessionId ?? deps.session.getSessionId()
    this._interrupted = false
    this.loop = new AgentLoop(deps)
  }

  /**
   * 运行 agent 核心循环
   * 返回 AsyncGenerator<AgentEvent> — 唯一的输出通道
   */
  async *run(input: AgentInput): AsyncGenerator<AgentEvent> {
    this._interrupted = false

    // 合并输入消息到内部状态
    if (input.messages && input.messages.length > 0) {
      this._messages = [...input.messages]
    }

    try {
      for await (const event of this.loop.run(input)) {
        // 更新内部状态
        this.updateState(event)
        // 转发事件给消费者
        yield event
        // 检查中断
        if (this._interrupted) {
          yield {
            type: 'done',
            reason: 'interrupted' as DoneReason,
          }
          return
        }
      }
    } catch (error) {
      yield {
        type: 'done',
        reason: 'error' as DoneReason,
        error,
      }
    }
  }

  /** 中断当前运行 */
  interrupt(): void {
    this._interrupted = true
  }

  /** 获取当前消息列表（只读） */
  getMessages(): readonly CoreMessage[] {
    return this._messages
  }

  /** 获取当前状态快照 */
  getState(): AgentState {
    return {
      messages: this._messages,
      turnCount: this._turnCount,
      totalUsage: { ...this._totalUsage },
      model: this._model,
      sessionId: this._sessionId,
    }
  }

  /** 切换模型 */
  setModel(model: string): void {
    this._model = model
  }

  // --- 内部状态更新 ---

  private updateState(event: AgentEvent): void {
    switch (event.type) {
      case 'message':
        this._messages = [...this._messages, event.message]
        // 累加 usage
        if (
          event.message.type === 'assistant' &&
          event.message.usage
        ) {
          this._totalUsage.input_tokens += event.message.usage.input_tokens
          this._totalUsage.output_tokens += event.message.usage.output_tokens
          if (event.message.usage.cache_creation_input_tokens) {
            this._totalUsage.cache_creation_input_tokens =
              (this._totalUsage.cache_creation_input_tokens ?? 0) +
              event.message.usage.cache_creation_input_tokens
          }
          if (event.message.usage.cache_read_input_tokens) {
            this._totalUsage.cache_read_input_tokens =
              (this._totalUsage.cache_read_input_tokens ?? 0) +
              event.message.usage.cache_read_input_tokens
          }
        }
        break
      case 'compaction':
        this._messages = [...event.after]
        break
      case 'done':
        // done 事件不需要额外状态更新
        break
    }
  }
}
