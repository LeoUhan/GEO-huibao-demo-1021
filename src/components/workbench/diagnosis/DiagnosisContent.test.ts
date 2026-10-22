import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { auditFindings, personas, prototypeTasks, strategies } from '../../../data/geo-data'
import DiagnosisContent from './DiagnosisContent.vue'

describe('diagnosisContent icons', () => {
  it('renders SVG check and warning marks while keeping check labels visible', () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings,
        personas,
        activePersona: personas[0]!.id,
        strategies,
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, DataList: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    expect(wrapper.get('.geo-diagnosis-summary').classes()).toContain('geo-diagnosis-summary')
    expect(wrapper.get('.geo-diagnosis-summary__header').text()).toContain('本轮监测')
    expect(wrapper.find('.geo-pending-entry').exists()).toBe(false)
    expect(wrapper.get('.geo-diagnosis-summary').text()).not.toContain('暂停监测')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('2026-10-02')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('采样总数1138')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('中 · 趋势级')
    expect(wrapper.findAll('.geo-check strong svg').length).toBe(7)
    expect(wrapper.findAll('.geo-check strong svg.lucide-triangle-alert').length).toBeGreaterThan(0)
    expect(wrapper.find('.geo-page-intro h1 svg.lucide-circle-question-mark').exists()).toBe(true)
    expect(wrapper.find('.geo-page-intro h1 .geo-help').exists()).toBe(false)
    expect(wrapper.get('.geo-page-intro h1 .overview-info-icon').attributes('aria-label')).toBe('诊断与策略说明')
    expect(wrapper.get('#audit-title .geo-section-heading__number').text()).toBe('1')
    expect(wrapper.get('#persona-title .geo-section-heading__number').text()).toBe('2')
    expect(wrapper.get('#persona-title').text()).toContain('买家人设 × 决策因子：认知 GAP')
    expect(wrapper.get('.geo-persona-panel__subtitle').text()).toBe('买家看重的因素与 AI 回答中呈现的内容之间的差距分析')
    expect(wrapper.get('#strategy-title .geo-section-heading__number').text()).toBe('3')
    expect(wrapper.get('#strategy-title .geo-help').text()).toBe('?')
    expect(wrapper.find('.geo-page-description').exists()).toBe(false)
    expect(wrapper.findAll('.geo-metric--button')).toHaveLength(0)
    expect(wrapper.text()).toContain('抓取渲染')
  })

  it('opens finding and strategy details and removes the candidate-generation bulk button', async () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings.map(item => ({ ...item })),
        personas,
        activePersona: personas[0]!.id,
        strategies: strategies.map(item => ({ ...item })),
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    expect(wrapper.findAll('.geo-finding-actions button').map(button => button.text())).not.toContain('生成候选策略')
    expect(wrapper.findAll('.geo-strategy-context button')).toHaveLength(0)
    expect(wrapper.get('.geo-finding-table thead .geo-finding-action-column').text()).toBe('操作')
    expect(wrapper.get('.geo-finding-table tbody .geo-finding-action-column').text()).toContain('查看详情')

    const findingDetails = wrapper.find('.geo-finding-table tbody tr button')
    expect(findingDetails.text()).toBe('查看详情')
    expect(findingDetails.attributes('data-variant')).toBe('secondary')
    expect(findingDetails.attributes('data-size')).toBe('md')
    expect(findingDetails.classes()).toContain('geo-finding-detail-button')
    expect(findingDetails.classes()).toContain('geo-table-detail-button')
    await findingDetails.trigger('click')
    expect(wrapper.emitted('openAudit')).toHaveLength(1)

    const strategyDetails = wrapper.findAll('.geo-strategy-table tbody tr button').find(button => button.text() === '查看详情')
    expect(strategyDetails).toBeDefined()
    expect(strategyDetails!.attributes('data-variant')).toBe('secondary')
    expect(strategyDetails!.attributes('data-size')).toBe('md')
    expect(strategyDetails!.classes()).toContain('geo-table-detail-button')
    expect(wrapper.find('.geo-strategy-table tbody button[data-variant="primary"]').exists()).toBe(false)
    await strategyDetails!.trigger('click')
    expect(wrapper.emitted('openStrategy')).toHaveLength(1)
  })

  it('shows a count-free bulk approval action for selected findings', async () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings.slice(0, 2).map(item => ({ ...item, checked: true })),
        personas,
        activePersona: personas[0]!.id,
        strategies,
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    const approval = wrapper.findAll('.geo-finding-actions button').find(button => button.text() === '审核通过并生成任务')
    expect(approval).toBeDefined()
    expect(approval!.attributes('data-variant')).toBe('secondary')
    expect(approval!.attributes('data-size')).toBe('md')
    expect(approval!.classes()).toContain('geo-finding-approve-button')
    expect(approval!.classes()).toContain('geo-table-detail-button')
    expect(wrapper.find('.geo-finding-head').text()).not.toContain('条异常')
    expect(wrapper.get('.geo-finding-selection-count').text()).toBe('已选 2')
    expect(wrapper.findAll('.geo-finding-actions button').map(button => button.text())).not.toContain('直接处理')
    await approval!.trigger('click')
    expect(wrapper.emitted('approveSelectedFindings')).toHaveLength(1)
    wrapper.unmount()
  })

  it('keeps the linked-task action styled like the strategy detail action', () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings,
        personas,
        activePersona: personas[0]!.id,
        strategies: strategies.filter(strategy => strategy.id === 'GS11').map(strategy => ({ ...strategy, confirmed: true })),
        tasks: prototypeTasks,
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    const linkedTask = wrapper.findAll('.geo-strategy-table tbody button').find(button => button.text() === '查看任务')
    expect(linkedTask).toBeDefined()
    expect(linkedTask!.attributes('data-variant')).toBe('secondary')
    expect(linkedTask!.attributes('data-size')).toBe('md')
    expect(linkedTask!.classes()).toContain('geo-table-detail-button')
  })
})
