import type { MarketTrend, RoundDetail } from '../api/monitoring'
import type { ReportRecord } from './report-center-data'

export interface ReportBaselineContext {
  date: string
  roundNo: number
  reason: string
  changedInPeriod: boolean
  crossBaseline: Record<'soa' | 'recommendation' | 'citation' | 'sov', boolean>
  validAnswers: number
  rates: Record<'soa' | 'recommendation' | 'citation' | 'sov', number | null>
  trend: Array<{ date: string, roundNo: number, soa: number | null, baseline: boolean }>
}

function periodStart(report: ReportRecord): string {
  const [year = 0, month = 1] = report.date.split('-').map(Number)
  if (report.type === 'monthly')
    return `${year}-${String(month).padStart(2, '0')}-01`
  if (report.type === 'quarterly')
    return `${year}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
  if (report.type === 'weekly') {
    const date = new Date(`${report.date}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - 7)
    return date.toISOString().slice(0, 10)
  }
  return report.date
}

export function buildReportBaselineContext(report: ReportRecord, trend: MarketTrend, details: Map<number, RoundDetail>): ReportBaselineContext | null {
  const historical = trend.rounds.map((round, index) => ({ round, point: trend.series.find(series => series.brandType === 1)?.points[index] }))
    .filter(item => item.round.monitorDate <= report.date)
    .sort((left, right) => left.round.roundNo - right.round.roundNo)
  const baselineIndex = historical.map((item, index) => item.round.questionBaseline || item.round.brandBaseline || item.round.citationBaseline ? index : -1).reduce((latest, index) => Math.max(latest, index), -1)
  const effectiveBaselineIndex = baselineIndex < 0 ? historical.length - 1 : baselineIndex
  if (effectiveBaselineIndex < 0)
    return null

  const baseline = historical[effectiveBaselineIndex]!.round
  const affectedIndex = (field: 'mentionRate' | 'recommendRate' | 'citationRate' | 'sovRate') => historical.map((item, index) => {
    const affects = item.round.questionBaseline || (field === 'citationRate' ? item.round.citationBaseline : item.round.brandBaseline)
    return affects ? index : -1
  }).reduce((latest, index) => Math.max(latest, index), -1)
  const applicableRounds = (field: 'mentionRate' | 'recommendRate' | 'citationRate' | 'sovRate') => historical.slice(Math.max(0, affectedIndex(field)))
    .filter(item => report.type === 'adhoc' ? item.round.roundId === historical.at(-1)?.round.roundId : item.round.monitorDate >= periodStart(report))
    .filter(item => item.point?.[field] != null && details.get(item.round.roundId)?.validSample)
  const validAnswers = applicableRounds('mentionRate').reduce((sum, item) => sum + (details.get(item.round.roundId)?.validSample ?? 0), 0)
  const crosses = (field: 'mentionRate' | 'recommendRate' | 'citationRate' | 'sovRate') => historical.some(item => item.round.monitorDate >= periodStart(report)
    && (item.round.questionBaseline || (field === 'citationRate' ? item.round.citationBaseline : item.round.brandBaseline)))
  const weighted = (field: 'mentionRate' | 'recommendRate' | 'citationRate' | 'sovRate') => {
    const applicable = applicableRounds(field)
    const denominator = applicable.reduce((sum, item) => sum + (details.get(item.round.roundId)?.validSample ?? 0), 0)
    if (!denominator)
      return null
    return Math.round(applicable.reduce((sum, item) => sum + (item.point?.[field] ?? 0) * (details.get(item.round.roundId)?.validSample ?? 0), 0) / denominator * 10) / 10
  }
  return {
    date: baseline.monitorDate,
    roundNo: baseline.roundNo,
    reason: [baseline.questionBaseline && '监测问题', baseline.brandBaseline && '品牌识别', baseline.citationBaseline && '官网识别'].filter(Boolean).join('、'),
    changedInPeriod: baseline.monitorDate >= periodStart(report),
    crossBaseline: { soa: crosses('mentionRate'), recommendation: crosses('recommendRate'), citation: crosses('citationRate'), sov: crosses('sovRate') },
    validAnswers,
    rates: { soa: weighted('mentionRate'), recommendation: weighted('recommendRate'), citation: weighted('citationRate'), sov: weighted('sovRate') },
    trend: trend.rounds.map((round, index) => ({ date: round.monitorDate, roundNo: round.roundNo, soa: trend.series.find(series => series.brandType === 1)?.points[index]?.mentionRate ?? null, baseline: !!(round.questionBaseline || round.brandBaseline || round.citationBaseline) })).reverse().slice(-12),
  }
}
