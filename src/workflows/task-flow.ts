import type { GeoTask, ServiceMode, TaskProgress } from '../data/geo-data'

export interface TaskFlowStep {
  title: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
}

const websiteSteps = [
  ['Task Brief 确认', '运营'],
  ['内容生成', 'Agent执行'],
  ['内容优化', '运营 + Agent执行'],
  ['内容确认', '客户审核'],
  ['AI 建站执行发布', '跨 Agent'],
  ['发布结果', '执行中'],
] as const

const externalSteps = [
  ['Task Brief 确认', '运营'],
  ['内容生成', 'Agent 执行'],
  ['内容优化', '运营 + Agent 执行'],
  ['内容确认', '客户审核'],
] as const

const repairSteps = [
  ['提交官网', '已提交'],
  ['返回结果', '技术处理结果'],
] as const

function stageIndex(task: GeoTask, serviceMode: ServiceMode): number {
  const progress = task.progress
  if (task.type === 'repair') {
    if (['site_returned', 'site_verifying', 'site_publish', 'site_failed', 'recheck', 'done'].includes(progress))
      return 1
    if (['site_submitted', 'site_running', 'site_submit'].includes(progress))
      return 1
    return 0
  }

  if (task.type === 'external') {
    if (progress === 'brief')
      return 0
    if (progress === 'done')
      return externalSteps.length
    if (['todo', 'running'].includes(progress))
      return 1
    if (progress === 'client_content_review')
      return 1
    if (progress === 'human')
      return serviceMode === 'managed' ? 2 : 3
    if (progress === 'client_review')
      return 3
    return 2
  }

  const indices: Partial<Record<TaskProgress, number>> = {
    brief: 0,
    todo: 1,
    running: 1,
    human: 2,
    client_content_review: 3,
    client_review: 3,
    site_submit: 4,
    site_submitted: 4,
    site_running: 4,
    site_returned: 5,
    site_verifying: 5,
    site_failed: 5,
    site_publish: 5,
    publish: 5,
    recheck: 5,
    done: 5,
  }
  return indices[progress] ?? 0
}

export function taskFlowFor(task: GeoTask, serviceMode: ServiceMode = 'managed'): TaskFlowStep[] {
  const definitions = task.type === 'repair' ? repairSteps : task.type === 'external' ? externalSteps : websiteSteps
  const current = stageIndex(task, serviceMode)

  return definitions.map(([title, detail], index) => ({
    title,
    detail,
    state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
  }))
}
