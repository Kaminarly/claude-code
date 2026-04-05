// CoreMessage — 严格的消息子集，核心循环只使用这些字段
// 主包 Message 类型在边界处转换为 CoreMessage

import type { UUID } from 'crypto'

// --- Content Block 类型（核心层需要的最小子集）---

export type TextContent = {
  type: 'text'
  text: string
}

export type ToolUseContent = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export type ToolResultContent = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | CoreContentBlock[]
  is_error?: boolean
}

export type ThinkingContent = {
  type: 'thinking'
  thinking: string
}

export type CoreContentBlock =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent
  | ({ type: string; [key: string]: unknown })

// --- Usage 类型 ---

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

// --- CoreMessage 联合类型 ---

export type CoreUserMessage = {
  type: 'user'
  uuid: UUID
  role: 'user'
  content: string | CoreContentBlock[]
  timestamp?: number
  [key: string]: unknown
}

export type CoreAssistantMessage = {
  type: 'assistant'
  uuid: UUID
  role: 'assistant'
  content: CoreContentBlock[]
  model?: string
  usage?: Usage
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
  timestamp?: number
  [key: string]: unknown
}

export type CoreSystemMessage = {
  type: 'system'
  uuid: UUID
  role?: never
  content?: string | CoreContentBlock[]
  subtype?: string
  timestamp?: number
  [key: string]: unknown
}

export type CoreMessage =
  | CoreUserMessage
  | CoreAssistantMessage
  | CoreSystemMessage
