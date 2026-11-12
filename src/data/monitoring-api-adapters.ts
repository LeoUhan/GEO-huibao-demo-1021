import type { MarketTrend } from '../api/monitoring'

export interface OverviewTrendSeries {
  id: string
  label: string
  color: string
  values: Array<number | null>
}

export interface OverviewTrend {
  weeks: string[]
  series: OverviewTrendSeries[]
  baselines?: Array<{ date: string, roundNo: number, question: boolean, brand: boolean, citation: boolean }>
}

const metricSeries = [
  { id: 'soa', label: '品牌提及率（SOA）', color: '#2563eb', key: 'mentionRate' },
  { id: 'recommendation', label: '品牌推荐率', color: '#059669', key: 'recommendRate' },
  { id: 'citation', label: '官网引用率', color: '#0891b2', key: 'citationRate' },
  { id: 'sov', label: '声量份额（SOV）', color: '#7c3aed', key: 'sovRate' },
] as const

export function toOverviewTrend(trend: MarketTrend): OverviewTrend {
  const ownBrand = trend.series.find(series => series.brandType === 1)
  if (!ownBrand || trend.rounds.length === 0)
    return { weeks: [], series: [] }

  const chronological = trend.rounds.map((round, index) => ({ round, point: ownBrand.points[index] }))
    .sort((left, right) => left.round.monitorDate.localeCompare(right.round.monitorDate) || left.round.roundNo - right.round.roundNo)

  return {
    weeks: chronological.map(item => item.round.monitorDate),
    baselines: (chronological.some(item => item.round.questionBaseline || item.round.brandBaseline || item.round.citationBaseline)
      ? chronological.filter(item => item.round.questionBaseline || item.round.brandBaseline || item.round.citationBaseline)
      : chronological.slice(-1)).map(({ round }) => ({ date: round.monitorDate, roundNo: round.roundNo, question: !!round.questionBaseline, brand: !!round.brandBaseline, citation: !!round.citationBaseline })),
    series: metricSeries.map((metric) => {
      const values = chronological.map(({ point }) => point ? point[metric.key] : null)
      return { id: metric.id, label: metric.label, color: metric.color, values }
    }),
  }
}
