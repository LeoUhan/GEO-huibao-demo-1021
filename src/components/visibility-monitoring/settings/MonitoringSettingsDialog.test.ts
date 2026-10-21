import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringSettingsDialog from './MonitoringSettingsDialog.vue'

const props = {
  open: true as const,
  frequency: 'weekly' as const,
  platforms: [{ id: 'chatgpt', label: 'ChatGPT', enabled: true }, { id: 'gemini', label: 'Gemini', enabled: true }],
  selectedPlatforms: ['chatgpt'],
  time: '05:00',
}

describe('monitoringSettingsDialog', () => {
  it('shows only available platforms and emits saved schedule and selected platforms', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.find('button[aria-label="关闭设置"] svg.lucide-x').exists()).toBe(true)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('每季度')
    expect(wrapper.find('.vm-schedule').exists()).toBe(false)
    expect(wrapper.text()).toContain('执行频率和时间将保存到当前市场的服务端计划')
    expect(wrapper.text()).toContain('保存当前设置')
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
    await wrapper.get('input[type="time"]').setValue('09:30')
    await wrapper.get('input[type="radio"][value="monthly"]').setValue()
    await wrapper.get('button.is-primary').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({ frequency: 'monthly', platforms: ['chatgpt'], time: '09:30' })
    wrapper.unmount()
  })

  it('cancels without emitting save', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    await wrapper.get('.vm-settings__foot button:not(.is-primary)').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})
