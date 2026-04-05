// AgentDeps — 依赖注入接口定义
// packages/agent 定义接口，src/ 提供实现

import type { CoreMessage, Usage } from './messages.js'
import type { CoreTool, ToolResult, PermissionResult, PermissionContext, ToolExecContext } from './tools.js'
import type { AgentState } from './state.js'

// --- Provider Dep ---

export interface ProviderStreamParams {
  /** 系统提示 */
  systemPrompt?: unknown
  /** 消息列表 */
  messages: CoreMessage[]
  /** 可用工具 */
  tools: CoreTool[]
  /** 模型 ID */
  model: string
  /** 最大 tokens */
  maxTokens?: number
  /** 温度 */
  temperature?: number
  /** 中断信号 */
  abortSignal?: AbortSignal
  /** 附加参数 */
  [key: string]: unknown
}

export type ProviderEvent =
  | { type: 'content_block_start'; index: number; content_block: { type: string; [key: string]: unknown } }
  | { type: 'content_block_delta'; index: number; delta: { type: string; [key: string]: unknown } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_start'; message: { id: string; model: string; usage: Usage; [key: string]: unknown } }
  | { type: 'message_delta'; delta: { stop_reason?: string; [key: string]: unknown }; usage: { output_tokens: number } }
  | { type: 'message_stop' }
  | { type: string; [key: string]: unknown }

export interface ProviderDep {
  /** 流式调用 LLM */
  stream(params: ProviderStreamParams): AsyncIterable<ProviderEvent>
  /** 获取当前模型 ID */
  getModel(): string
}

// --- Tool Dep ---

export interface ToolDep {
  /** 按名称查找工具 */
  find(name: string): CoreTool | undefined
  /** 执行工具 */
  execute(tool: CoreTool, input: unknown, context: ToolExecContext): Promise<ToolResult>
}

// --- Permission Dep ---

export interface PermissionDep {
  /** 权限检查 — 返回是否允许执行 */
  canUseTool(tool: CoreTool, input: unknown, context: PermissionContext): Promise<PermissionResult>
}

// --- Output Dep ---

export interface OutputDep {
  /** 发射事件到输出目标（Ink / JSON / Silent） */
  emit(event: unknown): void
}

// --- Hook Dep ---

export interface StopHookContext {
  /** hook 触发时的消息上下文 */
  [key: string]: unknown
}

export interface StopHookResult {
  /** 阻断的错误 */
  blockingErrors: string[]
  /** 是否阻止继续 */
  preventContinuation: boolean
}

export interface HookDep {
  /** Turn 开始回调 */
  onTurnStart(state: AgentState): Promise<void>
  /** Turn 结束回调 */
  onTurnEnd(state: AgentState): Promise<void>
  /** Stop hook — 可能阻止继续 */
  onStop(messages: CoreMessage[], context: StopHookContext): Promise<StopHookResult>
}

// --- Compaction Dep ---

export interface CompactionResult {
  /** 是否执行了压缩 */
  compacted: boolean
  /** 压缩后的消息列表（未压缩则为原列表） */
  messages: CoreMessage[]
  /** 压缩前后 token 差异 */
  tokensSaved?: number
}

export interface CompactionDep {
  /** 尝试压缩消息列表 */
  maybeCompact(messages: CoreMessage[], tokenCount: number): Promise<CompactionResult>
}

// --- Context Dep ---

export interface SystemPrompt {
  /** 系统提示内容 */
  content: unknown
  /** Caching 策略 */
  cacheConfig?: unknown
}

export interface ContextDep {
  /** 获取系统提示 */
  getSystemPrompt(): SystemPrompt[]
  /** 获取用户上下文（环境信息等） */
  getUserContext(): Record<string, string>
  /** 获取系统级上下文（git status 等） */
  getSystemContext(): Record<string, string>
}

// --- Session Dep ---

export interface SessionDep {
  /** 记录转录 */
  recordTranscript(messages: CoreMessage[]): Promise<void>
  /** 获取会话 ID */
  getSessionId(): string
}

// --- AgentDeps 汇总 ---

export interface AgentDeps {
  /** LLM 提供者 */
  provider: ProviderDep
  /** 工具注册表 */
  tools: ToolDep
  /** 权限门控 */
  permission: PermissionDep
  /** 输出目标 */
  output: OutputDep
  /** 钩子生命周期 */
  hooks: HookDep
  /** 上下文压缩 */
  compaction: CompactionDep
  /** 系统上下文 */
  context: ContextDep
  /** 会话存储 */
  session: SessionDep
}
