import { describe, expect, it } from 'vitest'
import { presentCredibility } from './credibility-presentation'

describe('presentCredibility', () => {
  it('maps service-provided high, medium, and low grades to user copy', () => {
    expect(presentCredibility('high').label).toBe('可信度高')
    expect(presentCredibility('medium').label).toBe('可信度中')
    expect(presentCredibility('low').label).toBe('可信度低')
  })

  it('does not mistake a trend-level classification for a high/medium/low grade', () => {
    expect(presentCredibility('trend')).toEqual({
      label: '可信度待评估',
      reason: '服务端当前返回趋势级口径，未提供高、中、低可信度评级。',
    })
  })

  it('keeps missing service grades empty', () => {
    expect(presentCredibility(null)).toEqual({
      label: '',
      reason: '',
    })
  })
})
