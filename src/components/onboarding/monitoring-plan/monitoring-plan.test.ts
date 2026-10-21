import { describe, expect, it } from 'vitest'
import { initialMonitoringPlatforms, toggleMonitoringPlatform } from './monitoring-plan'

describe('monitoring plan', () => {
  it('uses only platform codes supported by the backend contract', () => {
    expect(initialMonitoringPlatforms).toEqual(['chatgpt', 'perplexity', 'google_ai_overviews', 'gemini'])
  })

  it('toggles a platform without mutating the existing selection', () => {
    const selected = ['chatgpt', 'gemini'] as const

    expect(toggleMonitoringPlatform(selected, 'gemini')).toEqual(['chatgpt'])
    expect(toggleMonitoringPlatform(selected, 'perplexity')).toEqual(['chatgpt', 'gemini', 'perplexity'])
    expect(selected).toEqual(['chatgpt', 'gemini'])
  })
})
