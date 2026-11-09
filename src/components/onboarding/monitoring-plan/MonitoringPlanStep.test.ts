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
    expect(onboarding.text()).toContain('系统将按每周自动采集')
    expect(onboarding.text()).not.toContain('入门版')
    const frequencyInputs = onboarding.findAll<HTMLInputElement>('.ce-segmented__input')
    expect(frequencyInputs).toHaveLength(2)
    expect(frequencyInputs.find(input => input.element.value === 'weekly')?.element.checked).toBe(true)
    expect(frequencyInputs.find(input => input.element.value === 'weekly')?.element.disabled).toBe(true)
    expect(frequencyInputs.every(input => input.element.disabled)).toBe(true)
    expect(onboarding.text()).toContain('每月')
    expect(onboarding.findAll('.monitoring-plan-step__label')).toHaveLength(0)
    expect(onboarding.findAll('.monitoring-plan-platform')).toHaveLength(5)
    expect(onboarding.text()).toContain('敬请期待')
    expect(onboarding.findAll('.monitoring-plan-platform.is-included')).toHaveLength(1)
    expect(onboarding.find('button.monitoring-plan-platform').exists()).toBe(false)
    expect(onboarding.text()).toContain('套餐未包含')

    const marketSetup = mount(MonitoringPlanStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('设置该市场采集计划')
    expect(marketSetup.text()).toContain('查看套餐包含的采集频率')
  })

  it('highlights the monthly frequency when the plan specifies it', () => {
    const starter = mount(MonitoringPlanStep, { props: { ...props, frequency: 'monthly' } })
    expect(starter.text()).toContain('系统将按每月自动采集')
    expect(starter.get<HTMLInputElement>('input[value="monthly"]').element.checked).toBe(true)
    expect(starter.get<HTMLInputElement>('input[value="weekly"]').element.disabled).toBe(true)
    starter.unmount()
  })

  it('uses the package mapping and retains the configured frequency for other packages', async () => {
    const { frequencyForPlan } = await import('./monitoring-plan')
    expect(frequencyForPlan('basic', '入门版', 'weekly')).toBe('monthly')
    expect(frequencyForPlan('pro', '专业版', 'monthly')).toBe('weekly')
    expect(frequencyForPlan(undefined, '入门版')).toBe('monthly')
    expect(frequencyForPlan('growth', '成长版', 'monthly')).toBe('monthly')
  })
})
