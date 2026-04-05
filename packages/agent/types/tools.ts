// CoreTool — 核心循环对工具的最小抽象
// 不依赖主包的 Tool.ts 巨型类型

import type { z } from 'zod/v4'
import type { CoreContentBlock } from './messages.js'

// --- Tool 类型 ---

export type ToolInputJSONSchema = {
  type: 'object'
  properties?: { [key: string]: unknown }
  [key: string]: unknown
}

export interface CoreTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: ToolInputJSONSchema
  // type guard / 用户展示
  readonly userFacingName?: string
  readonly isLocal?: boolean
  readonly isMcp?: boolean
}

// --- Tool 执行结果 ---

export type ToolResult = {
  output: string | CoreContentBlock[]
  error?: boolean
  metadata?: {
    durationMs?: number
    [key: string]: unknown
  }
}

// --- Tool 执行上下文 ---

export interface ToolExecContext {
  /** 中断信号 */
  abortSignal: AbortSignal
  /** 当前 turn 的 tool_use 块 ID */
  toolUseId: string
  /** 附加上下文数据 */
  [key: string]: unknown
}

// --- 权限 ---

export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string }

export interface PermissionContext {
  /** 当前权限模式 */
  mode: string
  /** 工具输入 */
  input: unknown
  /** 附加上下文 */
  [key: string]: unknown
}
