// createProductionDeps — 从现有 ToolUseContext + QueryParams 构建 AgentDeps
// 这是唯一同时 import packages/agent 和 src/ 的地方

import type { AgentDeps, CoreMessage } from '@anthropic/agent'
import type { ToolUseContext, Message, Tools } from '../Tool.js'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import { ProviderDepImpl } from './ProviderDepImpl.js'
import { ToolDepImpl } from './ToolDepImpl.js'
import { PermissionDepImpl } from './PermissionDepImpl.js'
import { OutputDepImpl } from './OutputDepImpl.js'
import { HookDepImpl } from './HookDepImpl.js'
import { CompactionDepImpl } from './CompactionDepImpl.js'
import { ContextDepImpl } from './ContextDepImpl.js'
import { SessionDepImpl } from './SessionDepImpl.js'

export interface CreateDepsParams {
  tools: Tools
  toolUseContext: ToolUseContext
  canUseTool: CanUseToolFn
  emitFn?: (event: unknown) => void
  querySource?: string
}

export function createProductionDeps(params: CreateDepsParams): AgentDeps {
  const { tools, toolUseContext, canUseTool, emitFn, querySource } = params

  return {
    provider: new ProviderDepImpl(toolUseContext, querySource),
    tools: new ToolDepImpl(tools, toolUseContext),
    permission: new PermissionDepImpl(canUseTool, toolUseContext, tools),
    output: new OutputDepImpl(toolUseContext, emitFn),
    hooks: new HookDepImpl(toolUseContext),
    compaction: new CompactionDepImpl(toolUseContext),
    context: new ContextDepImpl(toolUseContext),
    session: new SessionDepImpl(),
  }
}

/**
 * 将主包 Message[] 转为 CoreMessage[]
 * 当前使用类型断言，边界处保留兼容
 */
export function toCoreMessages(messages: Message[]): CoreMessage[] {
  return messages as unknown as CoreMessage[]
}

/**
 * 将 CoreMessage[] 转回主包 Message[]
 */
export function fromCoreMessages(messages: CoreMessage[]): Message[] {
  return messages as unknown as Message[]
}

/**
 * 将 AgentEvent 转为主包的 query() yield 类型
 * 用于桥接新旧路径
 *
 * 关键格式映射：
 * - AgentEvent.stream → { type: 'stream_event', event } — QueryEngine 期望 stream_event 包装
 * - AgentEvent.message (assistant) → { type: 'assistant', message: { role, content, ... }, uuid, timestamp }
 * - AgentEvent.message (user) → { type: 'user', message: { role, content, ... }, uuid, timestamp }
 * - 其余事件在旧路径中没有对应类型，暂不转换
 */
export function fromAgentEvent(event: any): any {
  switch (event.type) {
    case 'message': {
      const msg = event.message
      if (!msg) return undefined
      // 如果消息已经是旧格式（有嵌套 message 属性），直接返回
      if (msg.message && typeof msg.message === 'object' && 'content' in msg.message) {
        return msg
      }
      // 否则将扁平 CoreMessage 转为嵌套 Message 格式
      if (msg.type === 'assistant') {
        return {
          type: 'assistant' as const,
          message: {
            role: 'assistant',
            content: msg.content,
            stop_reason: (msg as any).stop_reason ?? null,
            usage: (msg as any).usage ?? { input_tokens: 0, output_tokens: 0 },
            model: (msg as any).model,
            id: (msg as any).id,
          },
          uuid: (msg as any).uuid,
          timestamp: (msg as any).timestamp,
        }
      }
      if (msg.type === 'user') {
        return {
          type: 'user' as const,
          message: {
            role: 'user',
            content: msg.content,
          },
          uuid: (msg as any).uuid,
          timestamp: (msg as any).timestamp,
          toolUseResult: (msg as any).toolUseResult,
        }
      }
      if (msg.type === 'system') {
        return {
          type: 'system' as const,
          message: {
            role: 'system',
            content: (msg as any).content,
          },
          uuid: (msg as any).uuid,
          timestamp: (msg as any).timestamp,
          subtype: (msg as any).subtype,
        }
      }
      return undefined
    }
    case 'stream':
      // event.event 来自 provider.stream()（即 queryModel）
      // queryModel 已经将原始事件包装为 { type: 'stream_event', event: rawSDKEvent }
      // 所以直接透传即可，避免双重包装
      return event.event as any
    case 'request_start':
      // handleMessageFromStream 检查 type === 'stream_request_start' 来设置 spinner
      return { type: 'stream_request_start' as const }
    case 'done':
      // done/terminal 事件不应 yield 到消费方
      // query() 的 return 值已包含 terminal 信息
      return undefined
    default:
      // tool_start, tool_progress, tool_result, compaction 等新事件
      // 在旧路径中没有对应类型，暂不转换
      return undefined
  }
}
