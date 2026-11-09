import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringSettingsDialog from './MonitoringSettingsDialog.vue'

const props = {
  open: true as const,
  frequency: 'weekly' as const,
  selectedPlatforms: ['chatgpt'],
}

describe('monitoringSettingsDialog', () => {
  it('shows the five platform statuses and the locked frequency as read-only', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.find('button[aria-label="关闭设置"] svg.lucide-x').exists()).toBe(true)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.get('input[type="radio"][value="weekly"]').element).toHaveProperty('disabled', true)
    expect(wrapper.text()).toContain('每周')
    expect(wrapper.get('input[type="radio"][value="monthly"]').element).toHaveProperty('disabled', true)
    expect(wrapper.text()).toContain('每月')
    expect(wrapper.find('.vm-schedule').exists()).toBe(false)
    expect(wrapper.text()).toContain('采集日期与时间由系统安排')
    expect(wrapper.findAll('.vm-platform-grid li')).toHaveLength(5)
    expect(wrapper.text()).toContain('ChatGPT已包含')
    expect(wrapper.text()).toContain('Claude敬请期待')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes the plan preview', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    await wrapper.get('.vm-settings__foot button:not(.is-primary)').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
