import { computed, shallowRef } from 'vue'

export type ProcessingPage = 'overview' | 'visibility-monitoring' | 'diagnosis' | 'optimization' | 'report-center'
type ProcessingState = { startedAt: number, completed: number }
export type CollectionMessage = { id: number, title: string, route: string, createdAt: number, read: boolean }
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
const state = shallowRef<ProcessingState | null>(readState())
function readMessages(): CollectionMessage[] {
  try { return JSON.parse(localStorage.getItem(messageKey) || '[]') as CollectionMessage[] }
  catch { return [] }
}
const messages = shallowRef<CollectionMessage[]>(readMessages())
const now = shallowRef(Date.now())
function save(next: ProcessingState | null) {
  state.value = next
  try { next ? localStorage.setItem(storageKey, JSON.stringify(next)) : localStorage.removeItem(storageKey) }
  catch { /* The current tab still shows the transition. */ }
}
function addMessage(title: string, route: string) {
  const next = [{ id: Date.now(), title, route, createdAt: Date.now(), read: false }, ...messages.value]
  messages.value = next
  try { localStorage.setItem(messageKey, JSON.stringify(next)) } catch { /* Keep the in-session notice. */ }
}
function markMessageRead(id: number) {
  messages.value = messages.value.map(message => message.id === id ? { ...message, read: true } : message)
  try { localStorage.setItem(messageKey, JSON.stringify(messages.value)) } catch { /* Keep the in-session state. */ }
}
function clearReadMessages() {
  messages.value = messages.value.filter(message => !message.read)
  try { localStorage.setItem(messageKey, JSON.stringify(messages.value)) } catch { /* Keep the in-session state. */ }
}
export function startDataProcessing() { now.value = Date.now(); save({ startedAt: now.value, completed: 0 }) }
export function updateDataProcessing(): ProcessingPage[] {
  now.value = Date.now()
  if (!state.value) return []
  const completed = Math.min(processingPages.length, Math.floor((now.value - state.value.startedAt) / stageDuration))
  if (completed <= state.value.completed) return []
  const newlyCompleted = processingPages.slice(state.value.completed, completed)
  save({ ...state.value, completed })
  if (newlyCompleted.includes('visibility-monitoring')) addMessage('本轮概览与可见性监测结果已生成', 'overview')
  if (newlyCompleted.includes('optimization')) addMessage('诊断分析与优化策略已生成', 'diagnosis')
  if (newlyCompleted.includes('report-center')) addMessage('本期周报已生成', 'report-center')
  return newlyCompleted
}
export function useDataProcessing() {
  const completed = computed(() => state.value?.completed ?? processingPages.length)
  const running = computed(() => !!state.value && completed.value < processingPages.length)
  const isReady = (page: ProcessingPage) => computed(() => completed.value > processingPages.indexOf(page))
  const isCollecting = (page: ProcessingPage) => computed(() => page !== 'report-center' && !!state.value && !isReady(page).value)
  return { hasRun: computed(() => state.value !== null), completed, running, isReady, isCollecting, labels: processingLabels, start: startDataProcessing, messages, unreadCount: computed(() => messages.value.filter(message => !message.read).length), markMessageRead, clearReadMessages }
}
