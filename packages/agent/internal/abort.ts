// Abort — 中断处理逻辑
// 处理用户中断时的 pending tool_use synthetic result 生成

import type { CoreContentBlock, CoreMessage } from '../types/messages.js'

/**
 * 处理中断：为所有 pending 的 tool_use 生成 synthetic tool_result
 * 确保消息列表在 API 层面保持一致
 */
export function createSyntheticToolResults(
  messages: CoreMessage[],
  abortReason: string = 'interrupted',
): CoreContentBlock[] {
  const results: CoreContentBlock[] = []

  // 找到最后一条 assistant 消息中的 tool_use blocks
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.type === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'tool_use' &&
          'id' in block
        ) {
          results.push({
            type: 'tool_result',
            tool_use_id: block.id as string,
            content: `[${abortReason}] Tool execution was interrupted`,
            is_error: true,
          })
        }
      }
      break
    }
  }

  return results
}

/**
 * 检查中断信号并返回是否应该中止
 */
export function shouldAbort(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false
}
