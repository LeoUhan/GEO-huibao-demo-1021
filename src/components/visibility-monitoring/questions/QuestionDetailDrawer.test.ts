import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { visibilityMonitoringData as data } from '../../../data/visibility-monitoring-data'
import QuestionDetailDrawer from './QuestionDetailDrawer.vue'

describe('questionDetailDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the available snapshot and opens its cited page', async () => {
    const wrapper = mount(QuestionDetailDrawer, {
      attachTo: document.body,
      props: { question: data.questions[0]!, open: true, platforms: data.platforms },
    })

    expect(wrapper.find('.ce-drawer').exists()).toBe(true)
    expect(wrapper.findAll('.vm-table-scroll[role="region"][tabindex="0"]')).toHaveLength(2)
    expect(wrapper.find('.vm-trend-empty__icon svg.lucide-chart-no-axes-combined').exists()).toBe(true)
    expect(wrapper.get('.vm-table-scroll tbody button').classes()).toContain('geo-table-detail-button')
    expect(wrapper.find('.vm-batch-tabs').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('置信区间')
    expect(wrapper.find('.vm-detail-metrics').text()).not.toContain('95%')

    expect(wrapper.find('.vm-answer[open]').exists()).toBe(true)
    await wrapper.get('.vm-answer summary').trigger('click')
    expect(wrapper.find('.vm-answer[open]').exists()).toBe(false)
    await wrapper.get('.vm-answer summary').trigger('click')
    expect(wrapper.find('.vm-answer-chevron.lucide-chevron-down').exists()).toBe(true)
    const pageId = data.questions[0]!.platformResults.find(result => result.citedPages.length)!.citedPages[0]!
    await wrapper.get(`[data-cited-page="${pageId}"]`).trigger('click')
    expect(wrapper.find(`[data-cited-page="${pageId}"] svg.lucide-arrow-up-right`).exists()).toBe(true)
    expect(wrapper.emitted('selectSource')?.[0]).toEqual([pageId])
    wrapper.unmount()
  })

  it('jumps to the last of 30 batches and shows only the selected batch’s answer', async () => {
    const question = data.questions[0]!
    const samplingBatches = Array.from({ length: 30 }, (_, index) => ({
      ...question.samplingBatches[0]!,
      id: `sample-${index + 1}`,
    }))
    const batchResults = Object.fromEntries(samplingBatches.map((batch, index) => [
      batch.id,
      [{ ...question.platformResults[0]!, answer: `第 ${index + 1} 次的原始回答` }],
    ]))
    const wrapper = mount(QuestionDetailDrawer, {
      attachTo: document.body,
      props: { question: { ...question, samplingBatches, batchResults }, open: true, platforms: data.platforms },
    })

    expect(wrapper.get('[aria-label="上一次采集"]').attributes('disabled')).toBeDefined()
    await wrapper.get('select[aria-label="跳转到指定采集批次"]').setValue('29')
    expect(wrapper.get('[data-batch-id="sample-30"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.vm-answer[open] blockquote').text()).toBe('第 30 次的原始回答')
    expect(wrapper.get('[aria-label="下一次采集"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[aria-label="上一次采集"]').trigger('click')
    expect(wrapper.get('.vm-answer[open] blockquote').text()).toBe('第 29 次的原始回答')
    expect(wrapper.findAll('.vm-answer')).toHaveLength(1)
    wrapper.unmount()
  })
})
