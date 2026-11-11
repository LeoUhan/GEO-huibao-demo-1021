import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import GenerateLatestReportDialog from '../components/report-center/GenerateLatestReportDialog.vue'
import { readMockState, resetMockState, updateMockState } from '../mock/repository'
import { useGeoContextStore } from '../stores/geo-context'
import ReportCenterView from './ReportCenterView.vue'

async function mountReportCenter() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/report-center', component: ReportCenterView }] })
  await router.push('/report-center?marketId=1')
  await router.isReady()
  const wrapper = mount(ReportCenterView, { global: { plugins: [router], stubs: { Modal: { props: ['open', 'title', 'confirmText'], emits: ['confirm'], template: '<div v-if="open"><h2>{{ title }}</h2><slot /><button class="confirm" @click="$emit(\'confirm\')">{{ confirmText }}</button></div>' } } } })
  await flushPromises()
  return wrapper
}

describe('standalone report center', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetMockState()
    useGeoContextStore().marketId = 1
  })

  it('renders seeded local reports and retains report scope in local detail links', async () => {
    const wrapper = await mountReportCenter()
    expect(wrapper.text()).toContain('周度趋势报告')
    const reportLink = wrapper.find('[data-open-report]')
    expect(reportLink.exists()).toBe(true)
    expect(reportLink.attributes('href')).toMatch(/^\/\?reportId=\d+/)
    expect(reportLink.attributes('href')).toContain('marketId=1')
    wrapper.unmount()
  })

  it('opens report generation, then persists the generated item and decrements local quota', async () => {
    const wrapper = await mountReportCenter()
    await wrapper.get('[data-testid="generate-latest"]').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(GenerateLatestReportDialog).props('open')).toBe(true)
    await wrapper.get('.confirm').trigger('click')
    await flushPromises()
    expect(readMockState().reports.quota).toBe(1)
    expect(readMockState().reports.items.length).toBeGreaterThan(4)
    wrapper.unmount()
  })

  it('shows ten reports per page and paginates within the selected type', async () => {
    updateMockState((draft) => {
      const weekly = draft.reports.items.find(report => report.type === 'weekly')!
      draft.reports.items.push(...Array.from({ length: 11 }, (_, index) => ({
        ...weekly,
        id: `weekly-extra-${index}`,
        date: `2026-10-${String(index + 1).padStart(2, '0')}`,
      })))
    })
    const wrapper = await mountReportCenter()
    expect(wrapper.findAll('.report-card')).toHaveLength(10)
    expect(wrapper.get('[aria-label="报告列表分页"]').text()).toContain('每页 10 条')

    await wrapper.get('[data-report-filter="weekly"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.report-card')).toHaveLength(10)
    expect(wrapper.get('[aria-label="报告列表分页"]').text()).toContain('共 13 条')

    await wrapper.get('[aria-label="下一页报告"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.report-card')).toHaveLength(3)
    expect(wrapper.get('[aria-label="报告列表分页"]').text()).toContain('第 2 / 2 页')

    await wrapper.get('[data-report-filter="monthly"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.report-card')).toHaveLength(1)
    expect(wrapper.get('[aria-label="报告列表分页"]').text()).toContain('第 1 / 1 页')
    wrapper.unmount()
  })
})
