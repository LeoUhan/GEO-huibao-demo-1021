import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataList from '../../ui/ce/data-list/DataList.vue'
import MonitoringQuestionStep from './MonitoringQuestionStep.vue'

const props = {
  currentStep: 2,
  steps: ['市场与语言', '买家人设', '监测问题', '采集计划'],
  market: '法国',
  language: '法语',
  selectedIds: [],
  customQuestions: [],
}

describe('monitoringQuestionStep market setup copy', () => {
  it('uses market-scoped copy only when configuring an additional market', () => {
    const onboarding = mount(MonitoringQuestionStep, { props })
    expect(onboarding.get('h1').text()).toBe('确认首次监测问题')
    expect(onboarding.find('.monitoring-question-panel__custom svg.lucide-plus').exists()).toBe(true)

    const marketSetup = mount(MonitoringQuestionStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('配置该市场监测问题')
    expect(marketSetup.text()).toContain('当前配置市场：法国 · 法语')
    expect(marketSetup.text()).toContain('不同市场的问题配置分别保存')
  })

  it('uses the CE DataList table and gives the question column the remaining width', () => {
    const wrapper = mount(MonitoringQuestionStep, { props })

    expect(wrapper.findComponent(DataList).exists()).toBe(true)
    expect(wrapper.get('col:nth-child(1)').attributes('style')).toContain('width: 64px')
    expect(wrapper.get('th:nth-child(2)').attributes('style')).toContain('width: auto')
    expect(wrapper.get('th:nth-child(3)').attributes('style')).toContain('min-width: 230px')
    expect(wrapper.get('th:nth-child(3)').classes()).toContain('monitoring-question-table__wrap')
    expect(wrapper.get('th:nth-child(4)').classes()).toContain('monitoring-question-table__nowrap')
  })
})
