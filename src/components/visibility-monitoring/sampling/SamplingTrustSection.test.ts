import type { RoundDetail } from '../../../api/monitoring'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SamplingTrustSection from './SamplingTrustSection.vue'

const round: RoundDetail = {
  id: 8,
  roundNo: 2,
  triggerType: 1,
  roundStatus: 3,
  monitorDate: '2026-10-15',
  totalSample: 240,
  startedAt: null,
  customerId: 1,
  siteId: 2,
  marketId: 3,
  confidenceLevel: 'trend',
  finishedSampleCount: 240,
  validSample: 228,
  judgedCount: 220,
  pendingJudgeCount: 8,
  validReturnRate: 95,
  dualSourceRate: 90,
  manualReviewRate: 88,
  manualReviewCount: 3,
  repeatablePp: 3.1,
  ciValue: 3.1,
  finishedAt: null,
}

describe('sampling trust section', () => {
  it('shows a service-backed confidence summary instead of the supporting counts and interval', () => {
    const wrapper = mount(SamplingTrustSection, {
      props: {
        schedule: null,
        round,
        loading: false,
        error: '',
      },
    })

    expect(wrapper.text()).toContain('可信度待评估')
    expect(wrapper.text()).toContain('服务端当前返回趋势级口径')
    expect(wrapper.text()).not.toContain('240')
    expect(wrapper.text()).not.toContain('228')
    expect(wrapper.text()).not.toContain('95%')
    expect(wrapper.text()).not.toContain('3.1pp')
    wrapper.unmount()
  })
})
