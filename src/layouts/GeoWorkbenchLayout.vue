<script setup lang="ts">
import type { DropdownSelectOption } from '../components/ui/ce/dropdown-select/types'
import type { AuditCheck, AuditFinding, GeoPage, GeoTask, ServiceMode, Strategy, StrategyLayer, TaskFilter, UserRole } from '../data/geo-data'
import { computed, provide, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '../components/ui/ce/button/Button.vue'
import ActionCard from '../components/ui/ce/card/ActionCard.vue'
import DropdownSelect from '../components/ui/ce/dropdown-select/DropdownSelect.vue'
import Tag from '../components/ui/ce/tag/Tag.vue'
import AppIcon from '../components/ui/icons/AppIcon.vue'
import Textarea from '../components/ui/Textarea.vue'
import GeoDrawer from '../components/workbench/shared/GeoDrawer.vue'
import GeoWorkbenchToolbar from '../components/workbench/shared/GeoWorkbenchToolbar.vue'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { auditChecks, auditFindings, baselineMetrics, cloneGeoTask, displayObjectCodes, filterTasks, initialTasks, personas, prototypeTasks, strategies } from '../data/geo-data'
import { createRepairTask, generateFindingStrategy, orchestrateStrategy } from '../services/geo-orchestration'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import { ensureWorkflow, knowledgeLibrary } from '../workflows/task-workflow'
import '../styles/geo-workbench.css'

interface ReviewNote { role: UserRole | 'agent', name: string, time: string, text: string }
type DrawerType = 'strategy' | 'audit-finding' | 'audit-check' | 'baseline' | 'pending' | 'flow' | null
type FlowType = 'diagnosis' | 'optimization'
interface Snapshot { findings: AuditFinding[], strategies: Strategy[], tasks: GeoTask[], reviews: Record<string, ReviewNote[]> }
const route = useRoute()
const router = useRouter()
const isOnboardingPage = computed(() => route.name === 'onboarding')
const activePage = computed<GeoPage | 'overview' | 'visibility-monitoring' | 'report-center' | 'operations-review'>(() => route.name === 'overview' ? 'overview' : route.name === 'visibility-monitoring' ? 'visibility-monitoring' : route.name === 'report-center' ? 'report-center' : route.name === 'operations-review' ? 'operations-review' : ['optimization', 'task-detail'].includes(String(route.name)) ? 'optimization' : 'diagnosis')
const activeSidebarItem = computed(() => {
  if (isOnboardingPage.value)
    return undefined
  if (route.name === 'operations-review')
    return undefined
  if (activePage.value === 'overview')
    return '网站概览'
  if (activePage.value === 'diagnosis')
    return '网站审查'
  if (activePage.value === 'optimization')
    return '内容运营'
  if (activePage.value === 'visibility-monitoring')
    return '运维与设置'
  return '数据分析'
})
const sidebarSections = [
  { heading: '', items: [{ label: '网站建设', icon: 'globe', route: 'overview' }] },
  { heading: '整合视图', items: [{ label: '增长驾驶舱', icon: 'dashboard', route: 'overview' }] },
  { heading: '增长入口', items: [
    { label: '网站概览', icon: 'dashboard', route: 'overview' },
    { label: '网站审查', icon: 'visibility', route: 'diagnosis' },
    { label: '内容运营', icon: 'optimize', route: 'optimization' },
    { label: '智能落地页', icon: 'globe', route: 'optimization' },
    { label: '留资线索', icon: 'success', route: 'overview' },
    { label: '数据分析', icon: 'report', route: 'report-center' },
    { label: '运维与设置', icon: 'visibility', route: 'visibility-monitoring' },
  ] },
  { heading: '企业数字资产', items: [{ label: '企业知识库', icon: 'report', route: 'onboarding' }] },
] as const
const serviceMode = shallowRef<ServiceMode>('managed')
const role = shallowRef<UserRole>('ops')
const activePersona = shallowRef('engineering')
const strategyLayer = shallowRef<StrategyLayer>('全部')
const taskFilter = shallowRef<TaskFilter>('all')
const highlightedStrategy = shallowRef<string>()
const reviewText = ref('')
const reviewCategory = ref('')
const deferMode = ref(false)
const strategyIgnoreMode = ref(false)
const deferReason = ref('')
const reviewCategoryOptions: DropdownSelectOption[] = [
  { value: '优先级判断错误', label: '优先级判断错误' },
  { value: '标题生成不准确', label: '标题生成不准确' },
]
const deferReasonOptions: DropdownSelectOption[] = [
  { value: 'Agent 判断错误 / 策略不适用', label: 'Agent 判断错误 / 策略不适用' },
  { value: '事实 / 证据不足', label: '事实 / 证据不足' },
  { value: '重复策略 / 已有其他方案', label: '重复策略 / 已有其他方案' },
  { value: '时机不合适', label: '时机不合适' },
  { value: '执行成本过高', label: '执行成本过高' },
  { value: '不符合当前业务目标', label: '不符合当前业务目标' },
  { value: '其他', label: '其他' },
]
const drawer = reactive<{ type: DrawerType, item: Strategy | AuditFinding | AuditCheck | 'scope' | 'rounds' | 'diagnosis' | 'optimization' | null }>({ type: null, item: null })
const toast = shallowRef('')
const findings = reactive<AuditFinding[]>(auditFindings.map(finding => ({ ...finding })))
const strategyState = reactive<Strategy[]>(strategies.map(strategy => ({ ...strategy, methods: [...strategy.methods] })))
const taskStore = useWorkbenchTasksStore()
const tasks = taskStore.tasks
const reviewNotes = reactive<Record<string, ReviewNote[]>>({
  GS1: [{ role: 'agent', name: 'Agent', time: '刚刚', text: '已依据监测、诊断、人设与 GEO 规则生成候选策略。' }],
})
const visibleTasks = computed(() => filterTasks(tasks, taskFilter.value))
const pendingItems = computed(() => [
  ...findings.filter(finding => ['待处理', '待官网运营审核'].includes(finding.status)).map(finding => ({ kind: 'audit' as const, id: finding.id, title: finding.title, status: finding.status, priority: finding.priority, source: finding.check, summary: finding.detail, finding })),
  ...(serviceMode.value === 'managed' && role.value === 'ops' ? strategyState.filter(strategy => !strategy.confirmed && !strategy.ignored).map(strategy => ({ kind: 'strategy' as const, id: strategy.id, title: strategy.title, status: '待运营审核', priority: strategy.priority, source: strategy.source, summary: strategy.evidence, strategy })) : []),
  ...tasks.filter(task => ['brief', 'human', 'client_review', 'publish', 'site_submit', 'site_failed', 'site_publish'].includes(task.progress)).map(task => ({ kind: 'task' as const, id: task.id, title: task.name, status: task.progress === 'brief' ? 'Brief 待确认' : task.progress === 'human' ? '待结果审核' : task.progress === 'site_submit' ? '待提交 AI 建站' : task.progress === 'site_failed' ? '验证未通过' : task.progress === 'site_publish' || task.progress === 'publish' ? '待发布确认' : '待客户审核', priority: 'P1', source: task.source, summary: '进入任务处理当前阶段。', task })),
])
const flowSteps: Record<FlowType, Array<{ title: string, description: string }>> = {
  diagnosis: [
    { title: '监测形成诊断', description: 'Agent 根据监测、官网体检与买家 Gap 形成 Finding。' },
    { title: '判断处理出口', description: '确定性问题直接生成修复 Task；策略型问题生成候选策略。' },
    { title: '完成策略整理', description: '运营审核策略；客户只确认影响业务事实和执行范围的事项。' },
    { title: '进入优化中心', description: 'Agent 在后台去重、编排并创建 Task 草稿。' },
    { title: '执行与效果回流', description: '任务发布后 Re-check，结果回写诊断与 Agent 学习。' },
  ],
  optimization: [
    { title: 'Brief确认', description: '确认目标、范围与关键业务事实。' },
    { title: '内容生成', description: 'Agent生成文章并运行自动质检。' },
    { title: '文章审核', description: '客户或运营审核文章内容。' },
    { title: '最终稿确认', description: '确认官网内容版本。' },
    { title: '官网核验', description: '官网返回处理结果。' },
    { title: '完成', description: '流程完成。' },
  ],
}
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(message: string) {
  toast.value = message
  if (toastTimer)
    clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.value = '', 2600)
}
async function navigate(page: GeoPage) {
  await router.push({ name: page })
}
function snapshot(): Snapshot {
  return JSON.parse(JSON.stringify({ findings, strategies: strategyState, tasks, reviews: reviewNotes })) as Snapshot
}
let loadedMode: ServiceMode = 'managed'
function resetSnapshot() {
  findings.splice(0, findings.length, ...auditFindings.map(finding => ({ ...finding })))
  strategyState.splice(0, strategyState.length, ...strategies.map(strategy => ({ ...strategy, methods: [...strategy.methods] })))
  tasks.splice(0, tasks.length, ...[...prototypeTasks, ...initialTasks].map(cloneGeoTask))
  seedPrototypeTaskKnowledge()
  Object.keys(reviewNotes).forEach(key => delete reviewNotes[key])
  reviewNotes.GS1 = [{ role: 'agent', name: 'Agent', time: '刚刚', text: '已依据监测、诊断、人设与 GEO 规则生成候选策略。' }]
  findings.filter(finding => ['F7-1', 'F7-2'].includes(finding.id)).forEach(finding => finding.status = '待官网运营审核')
  strategyState.find(strategy => strategy.id === 'GS10')!.confirmed = true
}
function seedPrototypeTaskKnowledge() {
  const matchedKnowledge: Record<string, string[]> = {
    'T-2502': ['KB-003'],
    'T-2503': ['KB-003'],
    'T-2504': ['KB-002', 'KB-003'],
    'T-2505': ['KB-002', 'KB-003'],
  }
  for (const [taskId, knowledgeIds] of Object.entries(matchedKnowledge)) {
    const task = tasks.find(item => item.id === taskId)
    if (!task)
      continue
    const workflow = ensureWorkflow(task)
    const existingIds = workflow.knowledge.map(item => item.id).sort().join(',')
    if (taskId === 'T-2502' && existingIds === 'KB-002,KB-003')
      workflow.knowledge = knowledgeIds.map(id => knowledgeLibrary.find(item => item.id === id)!).filter(Boolean).map(item => ({ ...item }))
    if (!workflow.knowledge.length)
      workflow.knowledge = knowledgeIds.map(id => knowledgeLibrary.find(item => item.id === id)!).filter(Boolean).map(item => ({ ...item }))
  }
}
function persist(mode: ServiceMode = loadedMode) {
  try {
    localStorage.setItem(`geo-workbench:${mode}`, JSON.stringify(snapshot()))
  }
  catch {
    notify('本地保存不可用，当前操作仅保留在本次会话')
  }
}
function restore(mode: ServiceMode) {
  loadedMode = mode
  try {
    const raw = localStorage.getItem(`geo-workbench:${mode}`)
    if (!raw) {
      resetSnapshot()
      return false
    }
    const data = JSON.parse(raw) as Partial<Snapshot>
    if (!Array.isArray(data.findings) || !Array.isArray(data.strategies) || !Array.isArray(data.tasks)) {
      resetSnapshot()
      return false
    }
    findings.splice(0, findings.length, ...data.findings)
    strategyState.splice(0, strategyState.length, ...data.strategies)
    const restoredTasks = [
      ...prototypeTasks.filter(prototypeTask => !data.tasks!.some(task => task.id === prototypeTask.id)).map(cloneGeoTask),
      ...data.tasks.map(cloneGeoTask),
    ]
    for (const task of restoredTasks) {
      const prototypeTask = prototypeTasks.find(item => item.id === task.id)
      if (prototypeTask?.evidence && !task.evidence)
        task.evidence = prototypeTask.evidence
    }
    const prototypeTask = initialTasks.find(task => task.id === 'T-2401')!
    const oldTaskIndex = restoredTasks.findIndex(task => task.id === prototypeTask.id && task.type === 'repair')
    if (oldTaskIndex >= 0) {
      const previousTask = restoredTasks.splice(oldTaskIndex, 1)[0]
      const nextTaskNumber = Math.max(2402, ...restoredTasks.map(task => Number(task.id.replace(/\D/g, '')) || 0)) + 1
      previousTask.id = `T-${nextTaskNumber}`
      restoredTasks.unshift(cloneGeoTask(prototypeTask))
      restoredTasks.push(previousTask)
    }
    else if (!restoredTasks.some(task => task.id === prototypeTask.id)) {
      restoredTasks.unshift(cloneGeoTask(prototypeTask))
    }
    const preservedRepair = restoredTasks.find(task => task.id !== 'T-2403' && task.type === 'repair' && task.name === '核心产品页结构化数据修复')
    if (preservedRepair && !restoredTasks.some(task => task.id === 'T-2403'))
      preservedRepair.id = 'T-2403'
    tasks.splice(0, tasks.length, ...restoredTasks)
    seedPrototypeTaskKnowledge()
    Object.keys(reviewNotes).forEach(key => delete reviewNotes[key])
    Object.assign(reviewNotes, data.reviews ?? {})
    return true
  }
  catch {
    notify('保存记录无法读取，已恢复演示数据')
    return false
  }
}
// Seed data reflects the final prototype's repair and strategy workflow.
resetSnapshot()
restore('managed')
watch([findings, strategyState, tasks, reviewNotes], () => persist(), { deep: true })
watch(serviceMode, (mode) => {
  persist(loadedMode)
  drawer.type = null
  if (mode === 'agent')
    role.value = 'client'
  restore(mode)
  notify(mode === 'managed' ? '已切换到代运营模式：任务与审核记录已恢复' : '已切换到 Agent 自主模式：客户负责确认')
})
function toggleFinding(id: string) {
  if (role.value !== 'ops') {
    notify('当前为客户角色，诊断问题由运营审核')
    return
  }
  const finding = findings.find(item => item.id === id)
  if (finding?.status === '待处理')
    finding.checked = !finding.checked
}
function selectAllFindings(ids: string[]) {
  if (role.value !== 'ops') {
    notify('当前为客户角色，诊断问题由运营审核')
    return
  }
  const selected = findings.filter(finding => ids.includes(finding.id) && finding.status === '待处理')
  const checked = !selected.every(finding => finding.checked)
  selected.forEach(finding => finding.checked = checked)
}
function approveSelectedFindings() {
  if (serviceMode.value === 'managed' && role.value !== 'ops') {
    notify('当前为客户角色，诊断问题由运营审核')
    return
  }
  const selected = findings.filter(finding => finding.checked && finding.status === '待处理')
  if (!selected.length) {
    notify('请选择至少一条可审核的问题')
    return
  }
  selected.forEach(finding => processFinding(finding, false))
  notify('已审核通过并生成关联任务')
}
function confirmStrategy(strategy: Strategy) {
  const linked = tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
  if (linked) {
    openTask(linked)
    return
  }
  if (strategy.ignored) {
    notify('该策略已忽略，可在详情中查看审核记录')
    return
  }
  if (serviceMode.value === 'managed' && role.value !== 'ops') {
    notify('候选策略由运营完成专业审核，客户在 Brief 阶段确认业务信息')
    return
  }
  const task = orchestrateStrategy(tasks, strategy)
  reviewNotes[strategy.id] ??= []
  reviewNotes[strategy.id].push({ role: role.value, name: role.value === 'ops' ? '运营' : '客户', time: '刚刚', text: '运营审核通过，Agent 已自动编排关联 Task 草稿。' })
  reviewNotes[task.id] ??= []
  notify(`${displayObjectCodes(strategy.id)} 已审核，Agent 已自动编排任务`)
}
function openStrategy(strategy: Strategy) {
  reviewText.value = ''
  reviewCategory.value = ''
  strategyIgnoreMode.value = false
  drawer.type = 'strategy'
  drawer.item = strategy
}
function startIgnoreStrategy() {
  reviewText.value = ''
  reviewCategory.value = ''
  strategyIgnoreMode.value = true
}
function ignoreStrategy(strategy: Strategy) {
  if (!reviewCategory.value) {
    notify('请选择忽略原因')
    return
  }
  if (!reviewText.value.trim()) {
    notify('请填写忽略原因')
    return
  }
  strategy.ignored = true
  strategy.reviewNote = `${reviewCategory.value}：${reviewText.value.trim()}`
  reviewNotes[strategy.id] ??= []
  reviewNotes[strategy.id].push({ role: 'ops', name: '运营', time: '刚刚', text: `忽略候选策略 · ${strategy.reviewNote}` })
  notify('已记录忽略原因，来源诊断仍保留')
  strategyIgnoreMode.value = false
  reviewCategory.value = ''
  reviewText.value = ''
  drawer.type = null
}
function openTask(task: GeoTask) {
  drawer.type = null
  ensureWorkflow(task)
  void router.push({ name: 'task-detail', params: { taskId: task.id } })
}
function openPendingItem(item: (typeof pendingItems.value)[number]) {
  if (item.kind === 'task') {
    openTask(item.task)
    return
  }
  if (item.kind === 'audit') {
    openAudit(item.finding)
    return
  }
  openStrategy(item.strategy)
}
function openAudit(finding: AuditFinding) {
  drawer.type = 'audit-finding'
  drawer.item = finding
}
function taskForFinding(finding: AuditFinding) {
  const directTask = tasks.find(task => task.source.split(' / ').includes(finding.id))
  if (directTask)
    return directTask
  const strategy = strategyForFinding(finding)
  return strategy ? tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id)) : undefined
}
function strategyForFinding(finding: AuditFinding) {
  const mappedId = /专家|作者/.test(finding.title) ? 'GS14' : undefined
  return strategyState.find(strategy => strategy.source.split(' / ').includes(finding.id) || (mappedId && strategy.id === mappedId))
}
function canApproveFinding(finding: AuditFinding) {
  if (serviceMode.value === 'managed' && role.value !== 'ops')
    return false
  if (finding.status === '待处理')
    return true
  const strategy = finding.route === 'strategy' ? strategyForFinding(finding) : undefined
  return Boolean(strategy && !strategy.confirmed && !strategy.ignored && finding.status !== '暂不修复' && finding.status !== '已修复')
}
function canIgnoreFinding(finding: AuditFinding) {
  if (serviceMode.value !== 'managed' || role.value !== 'ops')
    return false
  const strategy = finding.route === 'strategy' ? strategyForFinding(finding) : undefined
  return Boolean(strategy && !strategy.confirmed && !strategy.ignored)
}
function ignoreFinding(finding: AuditFinding) {
  const strategy = strategyForFinding(finding)
  if (!strategy || !canIgnoreFinding(finding))
    return
  strategy.ignored = true
  strategy.reviewNote = '运营忽略候选策略，来源诊断仍保留。'
  notify('已忽略候选策略，来源诊断仍保留')
  drawer.type = null
}
function openFindingDestination(finding: AuditFinding) {
  const task = taskForFinding(finding)
  if (task) {
    openTask(task)
    return
  }
  const strategy = strategyForFinding(finding)
  if (strategy)
    openStrategy(strategy)
}
function openAuditCheck(check: AuditCheck) {
  drawer.type = 'audit-check'
  drawer.item = check
}
function relatedStrategies(check: AuditCheck) {
  const ids = new Set(check.strategyIds ?? [])
  return strategyState.filter(strategy => ids.has(strategy.id) || strategy.source.includes(check.source))
}
function processFinding(finding: AuditFinding, showNotification = true) {
  if (finding.route === 'strategy') {
    if (!canApproveFinding(finding))
      return
    const strategy = strategyForFinding(finding) ?? generateFindingStrategy(strategyState, finding)
    const task = orchestrateStrategy(tasks, strategy)
    reviewNotes[strategy.id] ??= []
    reviewNotes[strategy.id].push({ role: role.value, name: role.value === 'ops' ? '运营' : '客户', time: '刚刚', text: '审核通过并生成关联任务。' })
    reviewNotes[task.id] ??= []
    if (showNotification)
      notify(`${displayObjectCodes(strategy.id)} 已审核通过并生成任务`)
  }
  else {
    if (finding.status !== '待处理')
      return
    createRepairTask(tasks, finding)
    if (showNotification)
      notify('已审核通过并生成修复任务，进入官网运营审核')
  }
  drawer.type = null
}
function deferFinding(finding: AuditFinding) {
  if (!deferReason.value) {
    notify('请选择暂不修复原因')
    return
  }
  if (!reviewText.value.trim()) {
    notify('请填写暂不修复说明')
    return
  }
  finding.status = '暂不修复'
  finding.decisionReason = `${deferReason.value}：${reviewText.value.trim()}`
  finding.feedback = `${role.value === 'ops' ? '运营' : '客户'} · ${finding.decisionReason}`
  reviewText.value = ''
  deferReason.value = ''
  deferMode.value = false
  notify('已暂缓处理，异常将继续保留并监测')
  drawer.type = null
}
function startDeferFinding() {
  deferMode.value = true
  deferReason.value = ''
  reviewText.value = ''
}
function openPending() {
  drawer.type = 'pending'
  drawer.item = null
}
function openFlow(type: FlowType) {
  drawer.type = 'flow'
  drawer.item = type
}
function openBaseline(kind: 'scope' | 'rounds') {
  drawer.type = 'baseline'
  drawer.item = kind
}
function closeDrawer() {
  drawer.type = null
  drawer.item = null
  reviewText.value = ''
  reviewCategory.value = ''
  deferReason.value = ''
  deferMode.value = false
  strategyIgnoreMode.value = false
}
function openSourceStrategy(task: GeoTask) {
  const source = strategyState.find(strategy => strategy.id === task.strategy || task.relatedStrategies.includes(strategy.id))
  if (source) {
    highlightedStrategy.value = source.id
    strategyLayer.value = '全部'
    void navigate('diagnosis')
    openStrategy(source)
  }
  else {
    void navigate('diagnosis')
    notify(`任务来源诊断：${displayObjectCodes(task.source)}`)
  }
}
function drawerTitle() {
  if (drawer.type === 'strategy')
    return (drawer.item as Strategy).title
  if (drawer.type === 'audit-finding')
    return `异常处理 · ${(drawer.item as AuditFinding).title}`
  if (drawer.type === 'audit-check')
    return (drawer.item as AuditCheck).label
  if (drawer.type === 'pending')
    return '待处理事项'
  if (drawer.type === 'flow') {
    if (drawer.item === 'diagnosis')
      return '诊断与策略如何进入执行'
    const task = tasks.find(item => item.id === route.params.taskId)
    return task ? `${displayObjectCodes(task.id)} · ${task.name}` : '优化任务如何完成闭环'
  }
  if (drawer.type === 'baseline')
    return drawer.item === 'rounds' ? '监测轮次与数据范围' : '本周基础配置变更'
  return '详情'
}
function drawerSubtitle() {
  if (drawer.type === 'strategy')
    return undefined
  if (drawer.type === 'audit-finding')
    return undefined
  if (drawer.type === 'audit-check')
    return `官网 GEO 体检 · ${displayObjectCodes((drawer.item as AuditCheck).source)}`
  if (drawer.type === 'flow')
    return 'GEO Agent · 处理流程'
  if (drawer.type === 'baseline')
    return '分析口径 V2 · 09/17 23:40 更新'
  return undefined
}
function drawerEyebrow() {
  if (drawer.type === 'strategy') {
    const index = strategyState.findIndex(strategy => strategy.id === (drawer.item as Strategy).id)
    return `认知缺口策略 ${Math.max(1, index + 1)}`
  }
  if (drawer.type !== 'audit-finding')
    return undefined
  const index = findings.findIndex(finding => finding.id === (drawer.item as AuditFinding).id)
  return `异常${Math.max(1, index + 1)}`
}
function strategyStatusLabel(strategy: Strategy) {
  if (strategy.ignored)
    return '已忽略'
  if (strategy.confirmed)
    return '已通过'
  return serviceMode.value === 'managed' ? '待运营审核' : '待确认'
}
function strategyTypeLabel(strategy: Strategy) {
  const labels: Partial<Record<Strategy['layer'], string>> = {
    内容: '官网内容',
    结构: '结构化数据',
    技术: '技术修复',
    外部信源: '外部信源',
  }
  return labels[strategy.layer] ?? strategy.layer
}
function strategyRecommendation(strategy: Strategy) {
  const destination = strategy.layer === '内容'
    ? '官网内容优化'
    : strategy.layer === '外部信源'
      ? '外部信源建设'
      : `${strategyTypeLabel(strategy)}优化`
  return `建议采用${strategy.methods.join('、')}等方式，完成本次${destination}。`
}
function findingCheckLabel(finding: AuditFinding) {
  const checkIndex = auditChecks.findIndex(check => check.label === finding.check)
  const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦']
  return `${circledNumbers[checkIndex] ?? ''} ${finding.check}`.trim()
}
function findingStatusLabel(finding: AuditFinding) {
  const strategy = finding.route === 'strategy' ? strategyForFinding(finding) : undefined
  if (strategy && !strategy.confirmed && !strategy.ignored)
    return '待运营审核'
  if (finding.status === '暂不修复')
    return '暂不修复'
  if (finding.status === '已修复')
    return '已修复'
  if (finding.route === 'strategy' && finding.status === '已生成策略')
    return '已生成任务'
  return finding.status === '待官网运营审核' ? '待运营审核' : finding.status
}
provide(geoWorkbenchRouteContextKey, {
  findings,
  personas,
  activePersona,
  strategies: strategyState,
  tasks,
  strategyLayer,
  serviceMode,
  role,
  highlightedStrategy,
  taskFilter,
  visibleTasks,
  navigate,
  toggleFinding,
  selectAllFindings,
  approveSelectedFindings,
  openStrategy,
  confirmStrategy,
  openFlow,
  openAudit,
  openAuditCheck,
  openPending,
  openBaseline,
  openTask,
  openTaskSource: openSourceStrategy,
})
</script>

<template>
  <div class="geo-workbench">
    <header class="geo-app-header">
      <div class="geo-app-header__identity">
        <span class="geo-app-header__logo" aria-hidden="true">AI</span>
        <strong>独立站营销智能体</strong>
        <span class="geo-app-header__divider" aria-hidden="true" />
        <span class="geo-app-header__tenant">APW Waterjet</span>
        <span class="geo-app-header__plan">专业版</span>
        <AppIcon name="chevronDown" :size="16" class="geo-app-header__chevron" />
      </div>
      <div class="geo-app-header__account" aria-label="当前账户">
        <span class="geo-app-header__theme" aria-hidden="true">◐</span>
        <span class="geo-app-header__avatar" aria-hidden="true">运</span>
        <span>运营管理员</span>
        <AppIcon name="chevronDown" :size="14" />
      </div>
    </header>
    <aside class="geo-workbench-sidebar">
      <section v-for="section in sidebarSections" :key="section.heading || 'primary'" class="geo-workbench-sidebar__section">
        <h2 v-if="section.heading" class="geo-workbench-sidebar__heading">
          {{ section.heading }}
        </h2>
        <RouterLink
          v-for="item in section.items"
          :key="item.label"
          class="geo-workbench-sidebar__item"
          :class="{ 'is-active': item.label === activeSidebarItem }"
          :to="{ name: item.route, ...(item.route === 'onboarding' ? { query: { preview: '1' } } : {}) }"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </section>
      <RouterLink class="geo-workbench-sidebar__onboarding" :to="{ name: 'onboarding', query: { preview: '1' } }">
        新人引导演示
      </RouterLink>
    </aside>
    <div class="geo-main" :class="{ 'geo-main--onboarding': isOnboardingPage }">
      <GeoWorkbenchToolbar v-if="!isOnboardingPage" :active-page="activePage" :role="role" @update:role="role = $event" />
      <RouterView />
    </div>

    <GeoDrawer :open="drawer.type !== null" :title="drawerTitle()" :subtitle="drawerSubtitle()" :eyebrow="drawerEyebrow()" :size="drawer.type === 'strategy' ? 560 : drawer.type === 'audit-finding' ? 600 : 400" :title-first="drawer.type === 'strategy' || drawer.type === 'audit-finding'" @close="closeDrawer">
      <template v-if="drawer.type === 'strategy'">
        <div class="geo-strategy-drawer">
          <section class="geo-strategy-detail-card">
            <header class="geo-strategy-detail-card__header">
              <strong>认知缺口策略</strong>
              <span class="geo-strategy-drawer__status">{{ strategyStatusLabel(drawer.item as Strategy) }}</span>
            </header>
            <dl class="geo-strategy-detail-grid">
              <dt>优先级</dt><dd>{{ (drawer.item as Strategy).priority }}</dd>
              <dt>策略类型</dt><dd>{{ strategyTypeLabel(drawer.item as Strategy) }}</dd>
              <dt>目标人设</dt><dd>{{ (drawer.item as Strategy).persona }}</dd>
              <dt>决策因子</dt><dd>{{ (drawer.item as Strategy).factor }}</dd>
            </dl>
          </section>
          <section class="geo-strategy-detail-card">
            <header class="geo-strategy-detail-card__header">
              <strong>Agent 建议方法</strong>
            </header>
            <p class="geo-strategy-recommendation">
              {{ strategyRecommendation(drawer.item as Strategy) }}
            </p>
          </section>
          <section v-if="strategyIgnoreMode" class="geo-strategy-ignore-form" aria-label="忽略策略原因">
            <label class="geo-form-label">
              忽略原因
              <span class="geo-workbench-control">
                <DropdownSelect v-model="reviewCategory" :options="reviewCategoryOptions" v-bind="{ ariaLabel: '请选择忽略原因' }" />
              </span>
            </label>
            <Textarea id="strategy-ignore-comment" v-model="reviewText" class="geo-review-textarea" placeholder="补充说明" :rows="3" />
          </section>
        </div>
      </template>
      <template v-else-if="drawer.type === 'audit-finding'">
        <div class="geo-detail-section geo-audit-finding-detail">
          <div class="geo-detail-heading">
            <strong>问题性质与处理方式</strong><span class="geo-route-badge" :class="(drawer.item as AuditFinding).route">{{ (drawer.item as AuditFinding).route === 'repair' ? '官网技术 · 直接处理' : '官网内容 · 需要审核' }}</span>
          </div><dl>
            <dt>所属检查项</dt><dd>{{ findingCheckLabel(drawer.item as AuditFinding) }}</dd>
            <dt>当前状态</dt><dd><span class="geo-finding-status" :class="{ 'is-done': findingStatusLabel(drawer.item as AuditFinding) === '已修复', 'is-deferred': findingStatusLabel(drawer.item as AuditFinding) === '暂不修复' }">{{ findingStatusLabel(drawer.item as AuditFinding) }}</span></dd>
            <dt>异常说明</dt><dd>{{ (drawer.item as AuditFinding).detail }}</dd><dt>为什么这样处理</dt><dd>{{ (drawer.item as AuditFinding).routeReason }}</dd><dt v-if="(drawer.item as AuditFinding).decisionReason">
              暂缓原因
            </dt><dd v-if="(drawer.item as AuditFinding).decisionReason">
              {{ (drawer.item as AuditFinding).decisionReason }}
            </dd>
          </dl>
        </div>
        <div v-if="deferMode" class="geo-detail-section geo-defer-form">
          <strong>暂不修复说明</strong>
          <label class="geo-form-label">
            暂不修复原因 <span aria-hidden="true">*</span>
            <span class="geo-workbench-control">
              <DropdownSelect v-model="deferReason" :options="deferReasonOptions" v-bind="{ ariaLabel: '请选择暂不修复原因' }" />
            </span>
          </label>
          <label class="geo-form-label">
            暂不修复说明 <span aria-hidden="true">*</span>
            <Textarea id="finding-defer-comment" v-model="reviewText" class="geo-review-textarea" placeholder="例如：官网下周整体改版，本周暂不单独处理。" :rows="5" />
          </label>
        </div>
      </template>
      <template v-else-if="drawer.type === 'audit-check'">
        <div class="geo-detail-section">
          <div class="geo-detail-heading">
            <strong>检查结果</strong><Tag :tone="(drawer.item as AuditCheck).passed ? 'green' : 'red'" variant="soft" size="sm">
              {{ (drawer.item as AuditCheck).passed ? '通过' : '异常' }}
            </Tag>
          </div><dl>
            <dt>检查项</dt><dd>{{ (drawer.item as AuditCheck).label }}</dd><dt v-if="(drawer.item as AuditCheck).priority">
              优先级
            </dt><dd v-if="(drawer.item as AuditCheck).priority">
              {{ (drawer.item as AuditCheck).priority }}
            </dd><dt>结果</dt><dd>{{ (drawer.item as AuditCheck).result }}</dd><dt>证据说明</dt><dd>{{ (drawer.item as AuditCheck).evidence }}</dd><dt>来源诊断</dt><dd>{{ (drawer.item as AuditCheck).source }}</dd><dt>分析口径</dt><dd>V2 · 09/14–09/20</dd>
          </dl>
        </div><div v-if="relatedStrategies(drawer.item as AuditCheck).length" class="geo-detail-section">
          <strong>关联候选策略</strong><div class="geo-drawer-links">
            <Button v-for="strategy in relatedStrategies(drawer.item as AuditCheck)" :key="strategy.id" size="sm" @click="openStrategy(strategy)">
              {{ displayObjectCodes(strategy.id) }} · 查看策略
            </Button>
          </div><p class="geo-detail-copy">
            候选策略关联具体检测发现；业务信息和执行范围在 Brief 中确认。
          </p>
        </div>
      </template>
      <template v-else-if="drawer.type === 'pending'">
        <p class="geo-detail-copy">
          已按当前角色聚合待处理事项；进入对应对象继续处理。
        </p><div v-if="pendingItems.length" class="geo-pending-list">
          <ActionCard v-for="item in pendingItems" :key="`${item.kind}-${item.id}`" class="geo-pending-item" @click="openPendingItem(item)">
            <span><span class="geo-pending-item__labels"><i>{{ item.kind === 'audit' ? '诊断异常' : item.kind === 'strategy' ? '候选策略' : '执行任务' }}</i><i>{{ item.status }}</i></span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small><span class="geo-pending-item__meta"><span>优先级 {{ item.priority }}</span><span>来源：{{ item.source }}</span><span>当前周期</span></span></span><b>立即处理 <AppIcon name="arrowRight" :size="14" /></b>
          </ActionCard>
        </div><div v-else class="geo-empty-state">
          <strong>当前没有待处理事项</strong><span>新的诊断与审核事项会集中显示在这里。</span>
        </div>
      </template>
      <template v-else-if="drawer.type === 'flow'">
        <div class="geo-detail-note">
          页面默认只展示当前阶段和下一步；这里集中说明完整流程与角色分工。
        </div><div class="geo-flow-list">
          <div v-for="(step, index) in flowSteps[drawer.item as FlowType]" :key="step.title" class="geo-flow-item">
            <span>{{ index + 1 }}</span><div><strong>{{ step.title }}</strong><small>{{ step.description }}</small></div>
          </div>
        </div><section class="geo-flow-roles">
          <header class="geo-flow-roles__head">
            <h3>角色分工</h3><span>{{ serviceMode === 'managed' ? '代运营模式' : 'Agent 自主模式' }}</span>
          </header>
          <table class="geo-flow-role-table">
            <thead>
              <tr>
                <th scope="col">
                  角色
                </th><th scope="col">
                  主要职责
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Agent
                </th><td>诊断、生成、编排、自动检查与状态推进</td>
              </tr>
              <tr v-if="serviceMode === 'managed'">
                <th scope="row">
                  运营
                </th><td>专业审核、人工纠偏、提交 AI 建站和异常处理</td>
              </tr>
              <tr>
                <th scope="row">
                  客户
                </th><td>确认关键业务事实、重要执行范围和发布上线</td>
              </tr>
              <tr>
                <th scope="row">
                  AI 建站
                </th><td>执行官网页面与技术配置修改，返回预览稿和 Diff</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
      <template v-else-if="drawer.type === 'baseline'">
        <div class="geo-detail-note">
          正式策略只纳入已完成且达到可信度要求的监测轮次；进行中的监测不会实时改写正式策略。
        </div><div class="geo-detail-section">
          <div class="geo-detail-heading">
            <strong>本周策略分析基线 · 09/14–09/20</strong><Tag tone="green" variant="soft" size="sm">
              决策级可信度
            </Tag>
          </div><div class="geo-baseline-detail-grid">
            <div v-for="metric in baselineMetrics" :key="metric.label">
              <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.note }}</small>
            </div>
          </div>
        </div><div class="geo-detail-section">
          <strong>{{ drawer.item === 'scope' ? '配置变更记录' : '轮次状态' }}</strong><p class="geo-detail-copy">
            {{ drawer.item === 'scope' ? 'V2 于 09/17 10:20 生效，Query 从 59 增至 67；新增问题仅参与变更后的监测，不与变更前数据直接计算趋势。' : '已完成 4 轮，当前第 5 轮正在监测，剩余 2 轮达到可信度要求后纳入正式策略。' }}
          </p>
        </div>
      </template>
      <template #footer>
        <Button v-if="drawer.type === 'flow'" class="geo-flow-ack" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="closeDrawer">
          知道了
        </Button><Button v-else-if="!(drawer.type === 'audit-finding' && deferMode)" @click="closeDrawer">
          关闭
        </Button><template v-if="drawer.type === 'audit-finding' && role === 'ops' && (drawer.item as AuditFinding).route === 'repair' && (drawer.item as AuditFinding).status === '待处理'">
          <Button v-if="deferMode" @click="closeDrawer">
            取消
          </Button><Button v-if="deferMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="deferFinding(drawer.item as AuditFinding)">
            确认暂不修复
          </Button><template v-else>
            <Button @click="startDeferFinding">
              暂不修复
            </Button>
          </template>
        </template><Button v-if="drawer.type === 'audit-finding' && canIgnoreFinding(drawer.item as AuditFinding) && !deferMode" @click="ignoreFinding(drawer.item as AuditFinding)">
          忽略
        </Button><Button v-if="drawer.type === 'audit-finding' && canApproveFinding(drawer.item as AuditFinding) && !deferMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="processFinding(drawer.item as AuditFinding)">
          审核通过并生成任务
        </Button><Button v-if="drawer.type === 'audit-finding' && (drawer.item as AuditFinding).status !== '待处理' && (taskForFinding(drawer.item as AuditFinding) || strategyForFinding(drawer.item as AuditFinding))" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="openFindingDestination(drawer.item as AuditFinding)">
          {{ taskForFinding(drawer.item as AuditFinding) ? '进入任务' : '进入策略' }}
        </Button><template v-if="drawer.type === 'strategy' && serviceMode === 'managed' && role === 'ops' && !(drawer.item as Strategy).confirmed && !(drawer.item as Strategy).ignored">
          <Button v-if="strategyIgnoreMode" @click="strategyIgnoreMode = false">
            取消
          </Button><Button v-else @click="startIgnoreStrategy">
            忽略
          </Button><Button v-if="strategyIgnoreMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="ignoreStrategy(drawer.item as Strategy)">
            确认忽略
          </Button><Button v-else variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="confirmStrategy(drawer.item as Strategy)">
            审核通过并生成任务
          </Button>
        </template><Button v-if="drawer.type === 'strategy' && (drawer.item as Strategy).confirmed" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="confirmStrategy(drawer.item as Strategy)">
          查看关联任务
        </Button>
      </template>
    </GeoDrawer>
    <Transition name="geo-toast">
      <div v-if="toast" class="geo-toast" role="status">
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>
