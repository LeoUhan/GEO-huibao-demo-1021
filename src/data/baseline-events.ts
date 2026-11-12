export interface BaselineEvent {
  date: string
  roundNo: number
  question: boolean
  brand: boolean
  citation: boolean
}

export function baselineAffectsMetric(event: BaselineEvent, metric: string): boolean {
  return event.question || (metric === 'citation' ? event.citation : event.brand)
}

export function baselineReason(event: BaselineEvent): string {
  return [event.question && '监测问题', event.brand && '品牌识别', event.citation && '官网识别'].filter(Boolean).join('、')
}
