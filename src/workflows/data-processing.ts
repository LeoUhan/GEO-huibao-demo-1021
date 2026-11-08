import { computed, shallowRef } from 'vue'

export type ProcessingPage = 'overview' | 'visibility-monitoring' | 'diagnosis' | 'optimization' | 'report-center'
export type NotificationType =
  | 'monitoring.completed'
  | 'monitoring.partial'
  | 'monitoring.failed'
  | 'strategy.completed'
  | 'strategy.partial'
  | 'strategy.failed'
  | 'report.weekly'
  | 'report.monthly'
  | 'report.quarterly'
  | 'report.partial'
  | 'report.failed'
  | 'todo'
export type NotificationAction = { label: string, route: string, params?: Record<string, string>, query?: Record<string, string> }
export type CollectionMessage = {
  id: string
  businessKey: string
  batchId: string
  type: NotificationType
  category: string
  title: string
  body: string
  createdAt: number
  read: boolean
  action: NotificationAction
  todoStatus?: 'pending' | 'completed'
  todoCount?: number
}

type ProcessingState = { startedAt: number, completed: number }
const storageKey = 'geo-collection-demo:v2'
const messageKey = 'geo-collection-messages:v1'
const stageDuration = 5000
export const processingPages: ProcessingPage[] = ['overview', 'visibility-monitoring', 'diagnosis', 'optimization', 'report-center']
export const processingLabels: Record<ProcessingPage, string> = {
  overview: '概览', 'visibility-monitoring': '可见性监测', diagnosis: '诊断与策略', optimization: '优化中心', 'report-center': '周期报告',
}

function readState(): ProcessingState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null') as ProcessingState | null
    return parsed && Number.isFinite(parsed.startedAt) && Number.isFinite(parsed.completed) ? parsed : null
  }
  catch { return null }
}

function normalizeMessage(value: unknown, index: number): CollectionMessage | null {
  if (!value || typeof value !== 'object')
    return null
  const message = value as Partial<CollectionMessage> & { route?: string, title?: string, id?: string | number, createdAt?: number, read?: boolean, todoItems?: { completed?: boolean }[] }
  if (!message.title || (!message.action?.route && !message.route))
    return null
  const id = String(message.id ?? `legacy-${index}`)
  return {
    id,
    businessKey: message.businessKey ?? `legacy:${id}`,
    batchId: message.batchId ?? `legacy:${id}`,
    type: message.type ?? 'monitoring.completed',
    category: message.category ?? '监测',
    title: message.title,
    body: message.body ?? '任务结果已生成，可进入相关页面查看。',
    createdAt: message.createdAt ?? Date.now(),
    read: Boolean(message.read),
    action: message.action ?? { label: '查看详情', route: message.route ?? 'overview' },
    todoStatus: message.todoStatus,
    todoCount: message.todoCount ?? message.todoItems?.filter(item => !item.completed).length,
  }
}

function readMessages(): CollectionMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(messageKey) || '[]') as unknown[]
    return Array.isArray(parsed) ? parsed.map(normalizeMessage).filter((message): message is CollectionMessage => Boolean(message)) : []
  }
  catch { return [] }
}

const state = shallowRef<ProcessingState | null>(readState())
const restoredMessages = readMessages()
const messages = shallowRef<CollectionMessage[]>(restoredMessages.filter(message => !message.businessKey.startsWith('legacy:')))
const now = shallowRef(Date.now())
function save(next: ProcessingState | null) {
  state.value = next
  try { next ? localStorage.setItem(storageKey, JSON.stringify(next)) : localStorage.removeItem(storageKey) }
  catch { /* Keep this tab's demo state if browser storage is unavailable. */ }
}
function persistMessages() {
  try { localStorage.setItem(messageKey, JSON.stringify(messages.value)) }
  catch { /* Keep this tab's demo state if browser storage is unavailable. */ }
}
if (messages.value.length !== restoredMessages.length)
  persistMessages()
function upsertMessage(next: CollectionMessage) {
  const existingIndex = messages.value.findIndex(message => message.businessKey === next.businessKey)
  if (existingIndex < 0) {
    messages.value = [next, ...messages.value]
  }
  else {
    const existing = messages.value[existingIndex]
    const updated = [...messages.value]
    const merged = { ...existing, ...next, id: existing.id, createdAt: existing.createdAt, read: existing.read }
    if (existing.type === 'todo' && next.type === 'todo' && existing.todoStatus) {
      merged.todoStatus = existing.todoStatus
      merged.todoCount = existing.todoCount
      if (existing.todoStatus === 'completed') {
        merged.title = existing.title
        merged.body = existing.body
        merged.action = existing.action
      }
    }
    updated[existingIndex] = merged
    messages.value = updated
  }
  persistMessages()
}
function markMessageRead(id: string) {
  messages.value = messages.value.map(message => message.id === id ? { ...message, read: true } : message)
  persistMessages()
}
function clearReadMessages() {
  messages.value = messages.value.filter(message => !message.read || message.todoStatus === 'pending')
  persistMessages()
}
function demoMessage(input: Omit<CollectionMessage, 'id' | 'createdAt' | 'read'>): CollectionMessage {
  return { ...input, id: input.businessKey, createdAt: Date.now(), read: false }
}

export function loadNotificationExamples() {
  const examples: CollectionMessage[] = [
    demoMessage({ businessKey: 'demo:monitoring:de:round-5', batchId: 'monitoring-round-5', type: 'monitoring.completed', category: '监测完成', title: '德国·德语第5轮监测已完成', body: '本轮已完成 10,050/10,050 条有效采样，点击查看监测结果。', action: { label: '查看监测结果', route: 'visibility-monitoring', query: { marketId: '2', roundId: 'round-5' } } }),
    demoMessage({ businessKey: 'demo:monitoring:us:round-8', batchId: 'monitoring-round-8', type: 'monitoring.partial', category: '监测部分完成', title: '美国·英语第8轮监测部分完成', body: '本轮完成 8,942/10,050 条有效采样。Google AI 平台有 3 条问题未采集，已完成结果可查看。', action: { label: '查看监测结果', route: 'visibility-monitoring', query: { marketId: '3', roundId: 'round-8', showExceptions: '1' } } }),
    demoMessage({ businessKey: 'demo:monitoring:fr:round-4', batchId: 'monitoring-round-4', type: 'monitoring.failed', category: '监测失败', title: '法国·法语第4轮监测未完成', body: '本轮未能生成可用监测结果。系统自动重试后仍未成功，点击查看详情。', action: { label: '查看详情', route: 'visibility-monitoring', query: { marketId: '4', roundId: 'round-4', showFailure: '1' } } }),
    demoMessage({ businessKey: 'demo:strategy:de:batch-18', batchId: 'strategy-batch-18', type: 'strategy.completed', category: '策略生成完成', title: '德国·德语优化策略已生成', body: '基于第5轮监测结果，已生成 5 条优化策略，点击查看。', action: { label: '查看策略', route: 'diagnosis', query: { marketId: '2', batchId: 'strategy-batch-18' } } }),
    demoMessage({ businessKey: 'demo:strategy:us:batch-07', batchId: 'strategy-batch-07', type: 'strategy.partial', category: '策略生成异常', title: '美国·英语优化策略生成未完整完成', body: '本次已生成 3/5 条策略。2 条策略缺少有效证据，点击查看处理状态。', action: { label: '查看策略', route: 'diagnosis', query: { marketId: '3', batchId: 'strategy-batch-07' } } }),
    demoMessage({ businessKey: 'demo:strategy:fr:batch-03', batchId: 'strategy-batch-03', type: 'strategy.failed', category: '策略生成异常', title: '法国·法语优化策略生成失败', body: '本次未能生成可用策略。诊断数据尚未就绪，系统自动重试后仍未成功，点击查看详情。', action: { label: '查看策略', route: 'diagnosis', query: { marketId: '4', batchId: 'strategy-batch-03' } } }),
    demoMessage({ businessKey: 'demo:report:weekly:de:2026-11-02', batchId: 'report-weekly-de-2026-11-02', type: 'report.weekly', category: '周报', title: '德国·德语·11月2日—11月8日周报已生成', body: '本周 GEO 表现与优化简报已生成，可查看本周变化、平台表现和优化建议。', action: { label: '查看周报', route: 'report-detail', params: { reportId: '120260915' }, query: { marketId: '2', reportType: 'weekly' } } }),
    demoMessage({ businessKey: 'demo:report:monthly:us:2026-09', batchId: 'report-monthly-us-2026-09', type: 'report.monthly', category: '月报', title: '美国·英语·2026年9月月报已生成', body: '本月 GEO 月度表现与复盘已生成，可查看月度表现、持续短板和竞争差距。', action: { label: '查看月报', route: 'report-detail', params: { reportId: '220260914' }, query: { marketId: '3', reportType: 'monthly' } } }),
    demoMessage({ businessKey: 'demo:report:quarterly:de:2026-q3', batchId: 'report-quarterly-de-2026-q3', type: 'report.quarterly', category: '季报', title: '德国·德语·2026年第三季度季报已生成', body: '本季度 GEO 竞争格局复盘已生成，可查看竞争位置、结构性短板和阶段性机会。', action: { label: '查看季报', route: 'report-detail', params: { reportId: '320260910' }, query: { marketId: '2', reportType: 'quarterly' } } }),
    demoMessage({ businessKey: 'demo:report:partial:de:2026-10', batchId: 'report-monthly-de-2026-10', type: 'report.partial', category: '报告部分完成', title: '德国·德语·2026年10月报告已生成（数据不完整）', body: '报告已生成，但部分平台的监测数据缺失。点击查看报告及数据说明。', action: { label: '查看报告', route: 'report-detail', params: { reportId: '220260914' }, query: { marketId: '2', reportType: 'monthly', showDataNotes: '1' } } }),
    demoMessage({ businessKey: 'demo:report:failed:us:2026-q3', batchId: 'report-quarterly-us-2026-q3', type: 'report.failed', category: '报告生成失败', title: '美国·英语·2026年第三季度季报生成失败', body: '该报告暂不可查看。报告数据生成超时，系统自动重试后仍未成功，点击查看处理状态。', action: { label: '查看处理状态', route: 'report-center', query: { marketId: '3', taskId: 'report-quarterly-us-2026-q3' } } }),
  ]
  examples.forEach(upsertMessage)
  const todoKey = 'demo:todo:de:batch-2026-11-06-a'
  upsertMessage(demoMessage({
    businessKey: todoKey,
    batchId: 'todo-batch-2026-11-06-a',
    type: 'todo',
    category: '待用户处理',
    title: '有 3 项 GEO 内容待处理',
    body: '德国·德语市场有 3 条优化策略待审核，审核后可继续进入优化执行。',
    action: { label: '处理策略', route: 'diagnosis', query: { marketId: '2', batchId: 'todo-batch-2026-11-06-a' } },
    todoStatus: 'pending',
    todoCount: 3,
  }))
}

export function createPendingTodoBatch() {
  const nextNumber = messages.value.filter(message => message.type === 'todo').length + 1
  const batchId = `todo-batch-demo-${Date.now()}`
  const marketLabel = nextNumber % 2 ? '德国·德语' : '美国·英语'
  upsertMessage(demoMessage({
    businessKey: `demo:todo:${batchId}`,
    batchId,
    type: 'todo',
    category: '待用户处理',
    title: '有 2 项 GEO 内容待处理',
    body: `${marketLabel}市场有 2 条优化策略待审核，处理后可继续完成配置。`,
    action: { label: '处理策略', route: 'diagnosis', query: { marketId: nextNumber % 2 ? '2' : '3', batchId } },
    todoStatus: 'pending',
    todoCount: 2,
  }))
}

function addWorkflowMessage(page: ProcessingPage, startedAt: number) {
  const batchId = `demo-run-${startedAt}`
  if (page === 'visibility-monitoring') {
    upsertMessage(demoMessage({ businessKey: `${batchId}:monitoring`, batchId, type: 'monitoring.completed', category: '监测完成', title: '德国·德语第5轮监测已完成', body: '本轮已完成 10,050/10,050 条有效采样，点击查看监测结果。', action: { label: '查看监测结果', route: 'visibility-monitoring', query: { marketId: '2', roundId: 'round-5' } } }))
  }
  if (page === 'optimization') {
    upsertMessage(demoMessage({ businessKey: `${batchId}:strategy`, batchId, type: 'strategy.completed', category: '策略生成完成', title: '德国·德语优化策略已生成', body: '基于第5轮监测结果，已生成 5 条优化策略，点击查看。', action: { label: '查看策略', route: 'diagnosis', query: { marketId: '2', batchId: `${batchId}:strategy` } } }))
  }
  if (page === 'report-center') {
    upsertMessage(demoMessage({ businessKey: `${batchId}:report`, batchId, type: 'report.weekly', category: '周报', title: '德国·德语·11月2日—11月8日周报已生成', body: '本周 GEO 表现与优化简报已生成，可查看本周变化、平台表现和优化建议。', action: { label: '查看周报', route: 'report-detail', params: { reportId: '120260915' }, query: { marketId: '2', reportType: 'weekly' } } }))
  }
}

export function startDataProcessing() { now.value = Date.now(); save({ startedAt: now.value, completed: 0 }) }
export function updateDataProcessing(): ProcessingPage[] {
  now.value = Date.now()
  if (!state.value) return []
  const completed = Math.min(processingPages.length, Math.floor((now.value - state.value.startedAt) / stageDuration))
  if (completed <= state.value.completed) return []
  const newlyCompleted = processingPages.slice(state.value.completed, completed)
  save({ ...state.value, completed })
  newlyCompleted.forEach(page => addWorkflowMessage(page, state.value!.startedAt))
  return newlyCompleted
}
export function useDataProcessing() {
  const completed = computed(() => state.value?.completed ?? processingPages.length)
  const running = computed(() => !!state.value && completed.value < processingPages.length)
  const pendingTodoCount = computed(() => messages.value.filter(message => message.type === 'todo' && message.todoStatus === 'pending').reduce((total, message) => total + (message.todoCount ?? 0), 0))
  const isReady = (page: ProcessingPage) => computed(() => completed.value > processingPages.indexOf(page))
  const isCollecting = (page: ProcessingPage) => computed(() => page !== 'report-center' && !!state.value && !isReady(page).value)
  return { hasRun: computed(() => state.value !== null), completed, running, isReady, isCollecting, labels: processingLabels, start: startDataProcessing, messages, unreadCount: computed(() => messages.value.filter(message => !message.read).length), pendingTodoCount, markMessageRead, clearReadMessages, loadNotificationExamples, createPendingTodoBatch }
}
