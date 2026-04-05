// tokenBudget 纯逻辑测试

import { describe, test, expect } from 'bun:test'
import { createBudgetTracker, checkTokenBudget } from '../internal/tokenBudget.js'

describe('tokenBudget', () => {
  test('createBudgetTracker 初始状态', () => {
    const tracker = createBudgetTracker()
    expect(tracker.continuationCount).toBe(0)
    expect(tracker.lastDeltaTokens).toBe(0)
    expect(tracker.lastGlobalTurnTokens).toBe(0)
  })

  test('agentId 存在时直接 stop', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, 'agent-123', 10000, 5000)
    expect(result.action).toBe('stop')
    if (result.action === 'stop') {
      expect(result.completionEvent).toBeNull()
    }
  })

  test('budget 为 null 时直接 stop', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, undefined, null, 5000)
    expect(result.action).toBe('stop')
  })

  test('budget <= 0 时直接 stop', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, undefined, 0, 5000)
    expect(result.action).toBe('stop')
  })

  test('未达 90% 阈值时 continue', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, undefined, 10000, 5000)
    expect(result.action).toBe('continue')
    if (result.action === 'continue') {
      expect(result.pct).toBe(50)
      expect(result.nudgeMessage).toContain('50%')
    }
  })

  test('达到 90% 阈值时 stop', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, undefined, 10000, 9000)
    expect(result.action).toBe('stop')
  })

  test('连续低产出 (diminishing returns) 时 stop', () => {
    const tracker = createBudgetTracker()
    // 模拟 3 次低产出续写
    checkTokenBudget(tracker, undefined, 10000, 1000) // turn 1
    checkTokenBudget(tracker, undefined, 10000, 1500) // turn 2
    checkTokenBudget(tracker, undefined, 10000, 1800) // turn 3
    // 第 4 次仍低产出
    const result = checkTokenBudget(tracker, undefined, 10000, 2000)
    expect(result.action).toBe('stop')
    if (result.action === 'stop' && result.completionEvent) {
      expect(result.completionEvent.diminishingReturns).toBe(true)
    }
  })

  test('stop 后无 completionEvent (第一次就超过阈值)', () => {
    const tracker = createBudgetTracker()
    const result = checkTokenBudget(tracker, undefined, 10000, 9500)
    expect(result.action).toBe('stop')
    if (result.action === 'stop') {
      expect(result.completionEvent).toBeNull()
    }
  })
})
