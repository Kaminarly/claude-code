// SessionDepImpl — 将 AgentDeps.session 桥接到 sessionStorage + bootstrap/state
// 包装会话 ID 和转录记录

import type { SessionDep, CoreMessage } from '@anthropic/agent'
import type { Message } from '../Tool.js'
import { getSessionId } from '../bootstrap/state.js'
import { recordTranscript } from '../utils/sessionStorage.js'

export class SessionDepImpl implements SessionDep {
  getSessionId(): string {
    return getSessionId()
  }

  async recordTranscript(messages: CoreMessage[]): Promise<void> {
    try {
      await recordTranscript(messages as unknown as Message[])
    } catch {
      // 转录记录失败不影响核心循环
    }
  }
}
