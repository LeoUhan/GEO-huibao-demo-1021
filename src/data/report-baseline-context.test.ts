import type { MarketTrend, RoundDetail } from '../api/monitoring'
import type { ReportRecord } from './report-center-data'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { buildReportBaselineContext } from './report-baseline-context'
import { enhanceReportHtml } from './report-baseline-enhancement'

const report = { type: 'monthly', date: '2026-11-30' } as ReportRecord
const trend: MarketTrend = {
  rounds: [
    { roundId: 3, roundNo: 3, monitorDate: '2026-11-22', isComparablePrev: 1 },
    { roundId: 2, roundNo: 2, monitorDate: '2026-11-15', isComparablePrev: 0, questionBaseline: true },
    { roundId: 1, roundNo: 1, monitorDate: '2026-11-08', isComparablePrev: 1 },
  ],
  series: [{ brandType: 1, brandId: 1, brandName: 'APW', points: [
    { mentionRate: 50, recommendRate: 30, citationRate: 20, sovRate: 25 },
    { mentionRate: 20, recommendRate: 10, citationRate: 5, sovRate: 15 },
    { mentionRate: 90, recommendRate: 80, citationRate: 70, sovRate: 60 },
  ] }],
}

describe('report baseline aggregation', () => {
  it('weights only answers after the latest baseline and retains historical trend points', () => {
    const details = new Map<number, RoundDetail>([
      [1, { id: 1, validSample: 100 } as RoundDetail],
      [2, { id: 2, validSample: 100 } as RoundDetail],
      [3, { id: 3, validSample: 300 } as RoundDetail],
    ])
    const context = buildReportBaselineContext(report, trend, details)
    expect(context?.rates.soa).toBe(42.5)
    expect(context?.validAnswers).toBe(400)
    expect(context?.trend).toHaveLength(3)
    expect(context?.trend[1]?.baseline).toBe(true)
    expect(context?.changedInPeriod).toBe(true)
    const html = enhanceReportHtml('<html><body></body></html>', context ?? null)
    expect(html).toContain('跨基线不计算环比')
    expect(html).toContain('</script>')
    const fixture = '<html><body><div id="metrics-content"><article class="metric-cell"><span class="metric-delta">+4pp</span><strong class="metric-value">42%</strong><div class="metric-compare">较上期</div><p class="metric-note">旧口径</p></article></div><div id="summary-content"></div><div id="analysis-content"></div><div id="trends-content"><div class="chart-shell"></div></div></body></html>'
    const document = new JSDOM(enhanceReportHtml(fixture, context ?? null), { runScripts: 'dangerously' }).window.document
    expect(document.querySelector('.metric-value')?.textContent).toBe('42.5%')
    expect(document.querySelector('.metric-compare')?.textContent).toBe('跨基线不计算环比')
    expect(document.querySelector('.baseline-report-notice')?.textContent).toContain('400 条有效回答')
    expect(document.querySelector('#trends-content svg')?.getAttribute('aria-label')).toContain('基线更新')
  })

  it('does not add a baseline label to reports dated before the change', () => {
    expect(buildReportBaselineContext({ ...report, date: '2026-11-08' }, trend, new Map())).toBeNull()
  })

  it('keeps SOA answers before a citation-only baseline', () => {
    const citationTrend: MarketTrend = {
      ...trend,
      rounds: trend.rounds.map(round => round.roundId === 2 ? { ...round, questionBaseline: false, citationBaseline: true } : round),
    }
    const details = new Map<number, RoundDetail>([
      [1, { id: 1, validSample: 100 } as RoundDetail],
      [2, { id: 2, validSample: 100 } as RoundDetail],
      [3, { id: 3, validSample: 300 } as RoundDetail],
    ])
    const context = buildReportBaselineContext(report, citationTrend, details)
    expect(context?.rates.soa).toBe(52)
    expect(context?.rates.citation).toBe(16.3)
    expect(context?.crossBaseline).toEqual({ soa: false, recommendation: false, citation: true, sov: false })
  })
})
