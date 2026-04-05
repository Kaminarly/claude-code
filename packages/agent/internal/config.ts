// AgentConfig — 不可变运行时配置
// 从 src/query/config.ts 迁移，移除所有 src/ 依赖
// 所有值在构造时注入，不再直接访问外部模块

export interface AgentConfig {
  /** 会话 ID */
  sessionId: string

  /** 运行时门控开关 */
  gates: {
    /** 流式工具执行 */
    streamingToolExecution: boolean
    /** 发射工具使用摘要 */
    emitToolUseSummaries: boolean
    /** 是否为 Anthropic 内部用户 */
    isAnt: boolean
    /** 快速模式 */
    fastModeEnabled: boolean
  }
}

/** 创建 AgentConfig — 所有值由调用方提供 */
export function createAgentConfig(params: {
  sessionId: string
  streamingToolExecution?: boolean
  emitToolUseSummaries?: boolean
  isAnt?: boolean
  fastModeEnabled?: boolean
}): AgentConfig {
  return {
    sessionId: params.sessionId,
    gates: {
      streamingToolExecution: params.streamingToolExecution ?? false,
      emitToolUseSummaries: params.emitToolUseSummaries ?? false,
      isAnt: params.isAnt ?? false,
      fastModeEnabled: params.fastModeEnabled ?? true,
    },
  }
}
