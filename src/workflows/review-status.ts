import type { GeoTask, ServiceMode, Strategy } from '../data/geo-data'

export function pendingReviewLabel(mode: ServiceMode) {
  const reviewer = mode === 'agent' ? '客户' : '运营'
  return `待${reviewer}审核`
}

export function strategyReviewStatus(strategy: Strategy, tasks: GeoTask[], mode: ServiceMode) {
  if (strategy.ignored) return '已忽略'
  if (tasks.some(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))) return '已生成任务'
  if (strategy.confirmed) return '已通过'
  return pendingReviewLabel(mode)
}
