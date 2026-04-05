// AgentLoop 核心循环测试

import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { AgentLoop } from '../core/AgentLoop.js'
import { createMockDeps, END_TURN_EVENTS, createToolUseStreamEvents, createMockStream } from './fixtures/mockDeps.js'
import type { AgentDeps, CoreTool, ToolResult } from '../index.js'

describe('AgentLoop', () => {
  let deps: AgentDeps

  beforeEach(() => {
    deps = createMockDeps()
  })

  test('单 turn end_turn — LLM 不调用工具', async () => {
    deps.provider.stream = createMockStream(END_TURN_EVENTS)

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    expect(doneEvent).toBeDefined()
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('end_turn')
    }
  })

  test('tool_use 触发工具执行', async () => {
    const toolUseId = 'toolu_test123'
    const toolName = 'Bash'
    const mockTool: CoreTool = {
      name: 'Bash',
      description: 'Run bash command',
      inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
    }

    // 第一次调用返回 tool_use，第二次返回 end_turn
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents(toolName, toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => mockTool)
    deps.tools.execute = mock(async (): Promise<ToolResult> => ({
      output: 'command output',
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Run ls', messages: [] })) {
      events.push(event)
    }

    // 应该有 tool_start 和 tool_result 事件
    expect(events.some(e => e.type === 'tool_start')).toBe(true)
    expect(events.some(e => e.type === 'tool_result')).toBe(true)
  })

  test('权限拒绝 — 跳过工具执行', async () => {
    const toolUseId = 'toolu_deny123'
    const toolName = 'Bash'
    const mockTool: CoreTool = {
      name: 'Bash',
      description: 'Run bash command',
      inputSchema: { type: 'object' },
    }

    // 第一次调用返回 tool_use，第二次返回 end_turn
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents(toolName, toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => mockTool)
    deps.permission.canUseTool = mock(async () => ({
      allowed: false as const,
      reason: 'User denied',
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Run rm -rf', messages: [] })) {
      events.push(event)
    }

    // 不应该有 tool_start 事件
    expect(events.some(e => e.type === 'tool_start')).toBe(false)
  })

  test('maxTurns 限制', async () => {
    // 每次 LLM 返回 tool_use，循环继续
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount <= 3) {
        for (const event of createToolUseStreamEvents('Bash', `toolu_${callCount}`)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })

    deps.tools.find = mock(() => ({
      name: 'Bash',
      description: 'Bash',
      inputSchema: { type: 'object' },
    }) as CoreTool)
    deps.tools.execute = mock(async () => ({ output: 'ok' }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({
      prompt: 'test',
      messages: [],
      maxTurns: 2,
    })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('max_turns')
    }
  })

  test('中断信号 — 返回 interrupted', async () => {
    const abortController = new AbortController()
    // 立即中断
    abortController.abort()

    deps.provider.stream = createMockStream(END_TURN_EVENTS)

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({
      prompt: 'Hello',
      messages: [],
      abortSignal: abortController.signal,
    })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('interrupted')
    }
  })

  test('stop hook 阻止继续', async () => {
    deps.provider.stream = createMockStream(END_TURN_EVENTS)
    deps.hooks.onStop = mock(async () => ({
      blockingErrors: ['Test blocked'],
      preventContinuation: true,
    }))

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('stop_hook')
    }
  })

  test('provider 抛错 — 返回 error done', async () => {
    deps.provider.stream = mock(async function* () {
      throw new Error('API rate limit')
    })

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'Hello', messages: [] })) {
      events.push(event)
    }

    const doneEvent = events.find(e => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      expect(doneEvent.reason).toBe('error')
      expect(doneEvent.error).toBeDefined()
    }
  })

  test('工具不存在 — 返回错误 tool_result', async () => {
    const toolUseId = 'toolu_unknown'
    let callCount = 0
    deps.provider.stream = mock(async function* () {
      callCount++
      if (callCount === 1) {
        for (const event of createToolUseStreamEvents('UnknownTool', toolUseId)) {
          yield event
        }
      } else {
        for (const event of END_TURN_EVENTS) {
          yield event
        }
      }
    })
    deps.tools.find = mock(() => undefined) // 工具不存在

    const loop = new AgentLoop(deps)
    const events = []
    for await (const event of loop.run({ prompt: 'test', messages: [] })) {
      events.push(event)
    }

    // 不应该有 tool_start
    expect(events.some(e => e.type === 'tool_start')).toBe(false)
  })
})
