// @anthropic/agent — 公共导出
// 独立包，零运行时依赖

// --- 公共 API ---
export { AgentCore } from './core/AgentCore.js'

// --- 类型导出 ---
export type {
  AgentDeps,
  ProviderDep,
  ToolDep,
  PermissionDep,
  OutputDep,
  HookDep,
  CompactionDep,
  ContextDep,
  SessionDep,
  ProviderStreamParams,
  ProviderEvent,
  StopHookContext,
  StopHookResult,
  CompactionResult,
  SystemPrompt,
} from './types/deps.js'

export type {
  AgentEvent,
  DoneReason,
  MessageEvent,
  StreamEvent as AgentStreamEvent,
  ToolStartEvent,
  ToolProgressEvent,
  ToolResultEvent,
  PermissionRequestEvent,
  CompactionEvent,
  RequestStartEvent,
  DoneEvent,
} from './types/events.js'

export type {
  AgentState,
  AgentInput,
  TurnState,
} from './types/state.js'

export type {
  CoreMessage,
  CoreUserMessage,
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreContentBlock,
  Usage,
} from './types/messages.js'

export type {
  CoreTool,
  ToolResult,
  ToolExecContext,
  PermissionResult,
  PermissionContext,
  ToolInputJSONSchema,
} from './types/tools.js'
