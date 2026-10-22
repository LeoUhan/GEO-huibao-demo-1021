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
    expect(onboarding.text()).toContain('当前套餐按每周由系统固定采集。')
    expect(onboarding.text()).not.toContain('入门版')
    const frequencyInputs = onboarding.findAll<HTMLInputElement>('.ce-segmented__input')
    expect(frequencyInputs).toHaveLength(2)
    expect(frequencyInputs.find(input => input.element.value === 'weekly')?.element.checked).toBe(true)
    expect(frequencyInputs.find(input => input.element.value === 'weekly')?.element.disabled).toBe(false)
    expect(frequencyInputs.find(input => input.element.value === 'monthly')?.element.disabled).toBe(true)
    expect(onboarding.findAll('.monitoring-plan-step__label')).toHaveLength(0)
    expect(onboarding.findAll('.monitoring-plan-platform')).toHaveLength(5)
    expect(onboarding.text()).toContain('敬请期待')
    expect(onboarding.get('.monitoring-plan-platform[aria-pressed="false"]').attributes('disabled')).toBeUndefined()
    expect(onboarding.get('.monitoring-plan-platform:disabled').text()).toContain('Claude')

    const marketSetup = mount(MonitoringPlanStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('设置该市场采集计划')
    expect(marketSetup.text()).toContain('为该市场配置自动采集频率与 AI 平台')
  })

  it('shows only the current plan rule and an upgrade hint for the starter plan', () => {
    const starter = mount(MonitoringPlanStep, { props: { ...props, frequency: 'monthly', planName: '入门版' } })
    expect(starter.text()).toContain('入门版每月按系统固定采集')
    expect(starter.text()).toContain('可升级至成长版/专业版')
    expect(starter.text()).not.toContain('专业版默认每周')

    const professional = mount(MonitoringPlanStep, { props: { ...props, frequency: 'weekly', planName: '专业版' } })
    expect(professional.text()).toContain('专业版按每周由系统固定采集。')
    expect(professional.text()).not.toContain('可升级至')
    expect(professional.text()).not.toContain('入门版')
  })

  it('maps starter and professional plans to fixed monthly and weekly collection', async () => {
    const { frequencyForPlan } = await import('./monitoring-plan')
    expect(frequencyForPlan('basic', '入门版')).toBe('monthly')
    expect(frequencyForPlan('pro', '专业版')).toBe('weekly')
  })
})
