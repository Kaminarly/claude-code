// AgentState / AgentInput — 核心状态与运行时输入

import type { CoreMessage, Usage } from './messages.js'

// --- AgentState (只读快照) ---

export interface AgentState {
  /** 当前对话消息列表 */
  readonly messages: readonly CoreMessage[]
  /** 已完成的 turn 数 */
  readonly turnCount: number
  /** 累计 token 使用量 */
  readonly totalUsage: Usage
  /** 当前模型 */
  readonly model: string
  /** 会话 ID */
  readonly sessionId: string
}

// --- AgentInput (运行时输入) ---

export interface AgentInput {
  /** 用户 prompt（可为空，仅恢复对话） */
  prompt?: string
  /** 历史消息 */
  messages: CoreMessage[]
  /** 最大 turn 数 */
  maxTurns?: number
  /** 中断信号 */
  abortSignal?: AbortSignal
  /** Token 预算（null = 不限制） */
  tokenBudget?: number | null
  /** 附加附件 */
  attachments?: Array<{ type: string; [key: string]: unknown }>
}

// --- TurnState (内部 per-turn 状态) ---

export interface TurnState {
  /** 当前 turn 的 tool_use blocks */
  pendingToolUses: Array<{
    id: string
    name: string
    input: unknown
  }>
  /** 当前 turn 的 text blocks (流式累积) */
  textBlocks: Array<{ type: 'text'; text: string }>
  /** 当前正在填充的 text block 索引 */
  currentTextBlockIndex: number
  /** 当前 turn 的 thinking blocks (流式累积) */
  thinkingBlocks: Array<{ type: 'thinking'; thinking: string }>
  /** 当前正在填充的 thinking block 索引 */
  currentThinkingBlockIndex: number
  /** 当前 turn token 消耗 */
  turnUsage: Usage
  /** 是否有 stop hook 阻止继续 */
  stoppedByHook: boolean
  /** LLM stop_reason */
  stopReason?: string
}
