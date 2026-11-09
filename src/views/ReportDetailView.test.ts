import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    await vi.dynamicImportSettled()
    await flushPromises()

    const frame = wrapper.get('iframe')
    expect(frame.attributes('src')).toBeUndefined()
    expect(frame.attributes('srcdoc')).toContain('href="/?view=report-center&amp;siteId=demo-site-apw&amp;marketId=1"')
    expect(frame.attributes('title')).toContain('内容')
    wrapper.unmount()
  })

  it.each(['weekly', 'adhoc', 'quarterly', 'monthly'] as const)('opens the supplied %s report prototype from its report record', async (type) => {
    const record = (await import('../data/report-center-data')).initialReports.find(report => report.type === type)!
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/reports/:reportId', component: ReportDetailView }] })
    await router.push(`/reports/${mockReportId(record)}`)
    await router.isReady()
    const wrapper = mount(ReportDetailView, { global: { plugins: [router] } })
    await vi.dynamicImportSettled()
    await flushPromises()

    const frame = wrapper.get('iframe')
    const label = { weekly: '周报', adhoc: '次报', quarterly: '季报', monthly: '月报' }[type]
    expect(frame.attributes('title')).toBe(`${label}内容`)
    expect(frame.attributes('srcdoc')).toContain('href="about:srcdoc#details"')
    expect(frame.attributes('srcdoc')).toContain('一、管理层结论')
    wrapper.unmount()
  })
})
