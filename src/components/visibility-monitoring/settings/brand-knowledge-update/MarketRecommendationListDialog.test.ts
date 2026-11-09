import type { BrandKnowledgeUpdateSnapshot } from './types'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'

function makeSnapshot(markets = [{
  id: 'de-de',
  name: '德国 · 德语',
  language: '德语',
  enabled: false,
  processed: false,
  candidates: visibilityMonitoringData.questions.slice(0, 10),
  selectedCandidateIds: [],
  existingQuestions: visibilityMonitoringData.questions.slice(0, 2),
}]): BrandKnowledgeUpdateSnapshot {
  return { demo: true, editQuota: { total: 3, remaining: 2 }, knowledgeItems: [], markets }
}

describe('marketRecommendationListDialog', () => {
  it('shows market status and pending recommendation counts and emits actions', async () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot(), pendingAction: null, error: null } })
    expect(wrapper.text()).toContain('德国 · 德语')
    expect(wrapper.text()).toContain('已暂停')
    expect(wrapper.text()).toContain('10 条待处理')
    expect(wrapper.get('.market-manager__market-status').text()).toBe('已暂停')
    expect(wrapper.text()).not.toContain('开启全部市场')

    await wrapper.get('.market-manager__market').trigger('click')
    expect(wrapper.emitted('processMarket')?.[0]).toEqual(['de-de'])
    wrapper.unmount()
  })

  it('renders empty state for no markets', () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot([]), pendingAction: null, error: null } })
    expect(wrapper.text()).toContain('当前没有需要处理的市场')
    expect(wrapper.find('button.is-primary').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows running markets with the same save flow', () => {
    const snapshot = makeSnapshot()
    snapshot.markets[0]!.enabled = true
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot } })
    expect(wrapper.get('.market-manager__market-status').text()).toBe('运行中')
    expect(wrapper.text()).not.toContain('开启全部市场')
    wrapper.unmount()
  })

  it('disables duplicate actions while pending and exposes retry after failure', async () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot(), pendingAction: 'market:de-de', error: '网络暂不可用' } })
    expect(wrapper.text()).toContain('网络暂不可用')
    expect(wrapper.get('.market-manager__market').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="重试市场操作"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    wrapper.unmount()
  })
})
