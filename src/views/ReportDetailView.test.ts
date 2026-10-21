import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { findMockReportById, mockReportId } from '../mock/report-service'
import { resetMockState } from '../mock/repository'
import ReportDetailView from './ReportDetailView.vue'

describe('standalone report detail', () => {
  beforeEach(() => resetMockState())

  it('renders the selected report from the local report collection and preserves its back link scope', async () => {
    const first = findMockReportById(mockReportId((await import('../mock/repository')).readMockState().reports.items[0]!))!
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/reports/:reportId', component: ReportDetailView }] })
    await router.push(`/reports/${mockReportId(first)}?siteId=demo-site-apw&marketId=1`)
    await router.isReady()
    const wrapper = mount(ReportDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe(first.title)
    expect(wrapper.text()).toContain('GEO Agent')
    expect(wrapper.find('.toolbar-link').attributes('href')).toBe('/report-center?siteId=demo-site-apw&marketId=1')
    wrapper.unmount()
  })
})
