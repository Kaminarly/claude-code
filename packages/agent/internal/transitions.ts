// Transitions — 核心循环的终止/继续类型
// 原始 src/query/transitions.ts 是 stub，这里填充实际类型

/** 循环应该终止 */
export type Terminal = {
  type: 'terminal'
  reason: 'end_turn' | 'max_turns' | 'interrupted' | 'error' | 'stop_hook' | 'budget'
}

/** 循环应该继续（附带要追加的消息） */
export type Continue = {
  type: 'continue'
  /** 需要追加到消息列表的工具结果 */
  toolResults?: Array<{
    toolUseId: string
    result: unknown
  }>
}

export type Transition = Terminal | Continue
