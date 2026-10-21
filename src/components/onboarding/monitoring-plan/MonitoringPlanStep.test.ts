import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringPlanStep from './MonitoringPlanStep.vue'

const props = {
  currentStep: 3,
  steps: ['市场与语言', '买家人设', '监测问题', '采集计划'],
  frequency: 'weekly' as const,
  platforms: ['chatgpt' as const],
}

describe('monitoringPlanStep market setup copy', () => {
  it('uses market-specific copy only in the add-market flow', () => {
    const onboarding = mount(MonitoringPlanStep, { props })
    expect(onboarding.get('h1').text()).toBe('设置首次采集计划')
    expect(onboarding.find('.monitoring-plan-platform__check svg.lucide-check').exists()).toBe(true)

    const marketSetup = mount(MonitoringPlanStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('设置该市场采集计划')
    expect(marketSetup.text()).toContain('为该市场配置自动采集频率与 AI 平台')
  })
})
