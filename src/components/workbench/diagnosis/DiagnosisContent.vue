<script setup lang="ts">
import type { AuditCheck, AuditFinding, GeoTask, Persona, Strategy, StrategyLayer } from '../../../data/geo-data'
import type { DataListColumn } from '../../ui/ce/data-list/types'
import { storeToRefs } from 'pinia'
import { computed, shallowRef, watch } from 'vue'
import { auditChecks, displayObjectCodes } from '../../../data/geo-data'
import { useDiagnosisStore } from '../../../stores/diagnosis'
import Button from '../../ui/ce/button/Button.vue'
import Card from '../../ui/ce/card/Card.vue'
import DataList from '../../ui/ce/data-list/DataList.vue'
import Pagination from '../../ui/ce/pagination/Pagination.vue'
import Tag from '../../ui/ce/tag/Tag.vue'
import Tooltip from '../../ui/ce/tooltip/Tooltip.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'
import GeoPageIntro from '../shared/GeoPageIntro.vue'
import DeferredGeoRadarChart from './DeferredGeoRadarChart.vue'
import PersonaGapCard from './PersonaGapCard.vue'

const props = defineProps<{
  findings: AuditFinding[]
  personas: Persona[]
  activePersona: string
  strategies: Strategy[]
  allStrategies?: Strategy[]
  tasks?: GeoTask[]
  strategyLayer: StrategyLayer
  serviceMode: 'managed' | 'agent'
  role: 'ops' | 'client'
  highlightedStrategy?: string
}>()

const emit = defineEmits<{
  selectFinding: [id: string]
  selectAllFindings: [ids: string[]]
  approveSelectedFindings: []
  selectPersona: [id: string]
  setStrategyLayer: [layer: StrategyLayer]
  openStrategy: [strategy: Strategy]
  confirmStrategy: [strategy: Strategy]
  goOptimization: []
  openFlow: []
  openAudit: [finding: AuditFinding]
  openAuditCheck: [check: AuditCheck]
  openPending: []
}>()

const layers: StrategyLayer[] = ['全部', '内容', '结构', '实体与信任', '外部信源']
const diagnosisStore = useDiagnosisStore()
const { selectedGap } = storeToRefs(diagnosisStore)
const tableLabels = {
  bulkActions: '异常批量操作',
  selectedCount: (count: number) => `已选择 ${count} 项`,
  clearSelection: '清除选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部异常',
  loading: '正在加载',
  retry: '重试',
  selectRow: (label: string) => `选择 ${label}`,
}
const findingColumns: DataListColumn<unknown>[] = [
  { key: 'select', title: '', width: '5%', minWidth: 48, className: 'geo-finding-select' },
  { key: 'finding', title: '异常', width: '26%', minWidth: 245 },
  { key: 'route', title: '处理方式与类型', width: '17%', minWidth: 180 },
  { key: 'check', title: '所属检查项', width: '16%', minWidth: 160 },
  { key: 'priority', title: '优先级', width: '7%', minWidth: 64 },
  { key: 'status', title: '处理状态', width: '20%', minWidth: 190 },
  { key: 'actions', title: '操作', width: 120, minWidth: 120, className: 'geo-finding-action-column' },
]
const strategyColumns: DataListColumn<unknown>[] = [
  { key: 'id', title: '序号（问题编码）', width: '8%', minWidth: 96, className: 'geo-strategy-id' },
  { key: 'priority', title: '优先级', width: '5%', minWidth: 56, className: 'geo-strategy-priority' },
  { key: 'type', title: '策略类型', width: '9%', minWidth: 88, className: 'geo-strategy-type' },
  { key: 'description', title: '描述', width: '25%', minWidth: 250, className: 'geo-strategy-main' },
  { key: 'source', title: '来源', width: '6%', minWidth: 72, className: 'geo-strategy-source' },
  { key: 'factor', title: '人设·决策因子', width: '24%', minWidth: 200, className: 'geo-strategy-factor' },
  { key: 'status', title: '当前状态', width: '12%', minWidth: 120, className: 'geo-strategy-status' },
  { key: 'actions', title: '操作', width: 112, minWidth: 112, className: 'geo-strategy-actions' },
]
const activePersonaData = computed(() => props.personas.find(persona => persona.id === props.activePersona) ?? props.personas[0])
const activeGapItems = computed(() => activePersonaData.value?.gaps.map(gap => ({ ...gap, linkedCount: linkedStrategyCount(gap.name) })) ?? [])
const queuePage = shallowRef(1)
const auditPage = shallowRef(1)
const pageSize = 5
const auditFilter = shallowRef('all')
const allStrategies = computed(() => props.allStrategies ?? props.strategies)
const canReview = computed(() => props.serviceMode === 'managed' && props.role === 'ops')
const gapAliases: Record<string, string[]> = {
  本地服务与培训: ['本地服务', '培训', '售后', '服务网络', '服务'],
  认证与合规: ['认证', '合规', 'sameAs', 'Organization', '实体与信任'],
  交期与产能: ['交期', '产能', 'SLA', '交付'],
  交付稳定性: ['交期', '交付', '产能', 'SLA', '稳定交付'],
  供应链风险: ['供应链', '备件', '服务网络', '停机', '交期'],
  本地服务: ['本地服务', '服务', '代理', '培训'],
  代理支持: ['代理', '本地服务', '服务'],
  交期稳定: ['交期', '交付', '产能'],
  维护难度: ['维护', 'FAQ', '提问式H2', '内容切片', '结构优化'],
  停机风险: ['停机', '维护', '快速恢复', '稳定性'],
  培训成本: ['培训', '视频', 'YouTube', '支持机制'],
}
const layerCounts = computed(() => Object.fromEntries(layers.map(layer => [layer, layer === '全部' ? allStrategies.value.length : allStrategies.value.filter(strategy => strategy.layer === layer).length])))
function matchesGap(strategy: Strategy, name: string) {
  const aliases = [name, ...(gapAliases[name] ?? [])]
  const haystack = [strategy.title, strategy.factor, strategy.evidence, strategy.layer, strategy.persona, ...strategy.methods].join(' ').toLocaleLowerCase()
  return aliases.some(alias => haystack.includes(alias.toLocaleLowerCase()))
}
function matchesPersona(strategy: Strategy) {
  const persona = activePersonaData.value
  return !!persona && (!!strategy.personaIds?.includes(persona.id) || strategy.persona.includes(persona.name))
}
function strategyGaps(strategy: Strategy) {
  return activePersonaData.value?.gaps.filter(gap => matchesGap(strategy, gap.name)) ?? []
}
function personaScore(strategy: Strategy) {
  const matchedGaps = activePersonaData.value?.gaps.filter(gap => matchesGap(strategy, gap.name)) ?? []
  const maxGap = matchedGaps.length ? Math.max(...matchedGaps.map(gap => gap.value)) : 0
  const priorityBase = strategy.priority === 'P0' ? 300 : strategy.priority === 'P1' ? 200 : 100
  return priorityBase + maxGap * 1.6 + (matchesPersona(strategy) ? 28 : 0)
}
const sortedStrategies = computed(() => {
  const filtered = allStrategies.value.filter(strategy => props.strategyLayer === '全部' || strategy.layer === props.strategyLayer)
  return [...filtered].sort((a, b) => {
    const gapOrder = selectedGap.value ? Number(matchesGap(b, selectedGap.value)) - Number(matchesGap(a, selectedGap.value)) : 0
    return gapOrder || personaScore(b) - personaScore(a) || a.priority.localeCompare(b.priority)
  })
})
const queuePages = computed(() => Math.max(1, Math.ceil(sortedStrategies.value.length / pageSize)))
const visibleStrategies = computed(() => sortedStrategies.value.slice((queuePage.value - 1) * pageSize, queuePage.value * pageSize))
const activeAuditCheck = computed(() => auditChecks.find(check => check.id === auditFilter.value))
const filteredFindings = computed(() => activeAuditCheck.value ? props.findings.filter(finding => finding.check === activeAuditCheck.value?.label) : props.findings)
const auditPages = computed(() => Math.max(1, Math.ceil(filteredFindings.value.length / pageSize)))
const visibleFindings = computed(() => filteredFindings.value.slice((auditPage.value - 1) * pageSize, auditPage.value * pageSize))
function findingFromRow(item: unknown) {
  return item as AuditFinding
}
function strategyFromRow(item: unknown) {
  return item as Strategy
}
function isActionable(finding: AuditFinding) {
  return finding.status === '待处理'
}
function findingRouteLabel(finding: AuditFinding) {
  if (finding.route === 'strategy')
    return '官网内容 · 需要审核'
  if (finding.id === 'F9')
    return '信息口径 · 确认后处理'
  return '官网技术 · 直接处理'
}
function findingStatusLabel(finding: AuditFinding) {
  if (finding.status === '已修复')
    return '已修复'
  if (finding.status === '暂不修复')
    return '暂不修复'
  if (finding.status === '已生成策略')
    return '已生成候选策略'
  if (finding.route === 'repair')
    return '待官网运营审核'
  return props.serviceMode === 'agent' ? '待客户审核诊断' : '待运营审核诊断'
}
function findingCheckLabel(finding: AuditFinding) {
  const index = auditChecks.findIndex(check => check.label === finding.check)
  return `${['①', '②', '③', '④', '⑤', '⑥', '⑦'][index] ?? ''} ${finding.check}`.trim()
}
const actionableFindings = computed(() => visibleFindings.value.filter(isActionable))
const selectedFindings = computed(() => props.findings.filter(finding => isActionable(finding) && finding.checked))
const selectedCount = computed(() => selectedFindings.value.length)
const pageSelectedCount = computed(() => actionableFindings.value.filter(finding => finding.checked).length)
const allSelected = computed(() => actionableFindings.value.length > 0 && actionableFindings.value.every(finding => finding.checked))
function taskFor(strategy: Strategy) {
  return props.tasks?.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
}
function strategyCollaborationLabel(strategy: Strategy) {
  if (strategy.ignored)
    return '已忽略'
  return props.serviceMode === 'managed' ? '运营审核' : 'Agent 编排'
}
const confirmedCount = computed(() => allStrategies.value.filter(strategy => strategy.confirmed && !strategy.ignored && !taskFor(strategy)).length)
const reviewCount = computed(() => allStrategies.value.filter(strategy => !strategy.confirmed && !strategy.ignored && !taskFor(strategy)).length)
const pendingCount = computed(() => props.findings.filter(finding => finding.status === '待处理' || finding.status === '待官网运营审核').length + (canReview.value ? reviewCount.value : 0))
const passedCount = computed(() => auditChecks.filter(check => check.passed).length)
watch(() => props.strategyLayer, () => queuePage.value = 1)
watch(() => props.activePersona, () => {
  diagnosisStore.clearFocusedGap()
  queuePage.value = 1
})
watch(queuePages, pages => queuePage.value = Math.min(queuePage.value, pages))
watch(auditPages, pages => auditPage.value = Math.min(auditPage.value, pages))
function openCheck(check: AuditCheck) {
  auditFilter.value = check.id
  auditPage.value = 1
}
function clearAuditFilter() {
  auditFilter.value = 'all'
  auditPage.value = 1
}
function focusGap(name: string) {
  diagnosisStore.focusGap(name)
  queuePage.value = 1
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  document.getElementById('strategy-title')?.scrollIntoView({ behavior, block: 'start' })
}
function linkedStrategyCount(name: string) {
  return allStrategies.value.filter(strategy => matchesGap(strategy, name)).length
}
function summaryText({ total, page, pages }: { total: number, page: number, pages: number }) {
  return `共 ${total} 条 · 第 ${page} / ${pages} 页`
}
</script>

<template>
  <div class="geo-content geo-diagnosis">
    <GeoPageIntro variant="workbench" title="诊断与策略" help-label="诊断与策略说明" description="网站基础问题生成修复任务；内容与认知问题进入统一策略队列，确认后由 Agent 扫描去重，再进入优化中心。">
      <template #actions>
        <div class="geo-page-head__actions">
          <span class="geo-stage">当前阶段 · 确认问题与处理方向</span>
          <Button variant="text" size="sm" type="button" @click="emit('openFlow')">
            查看流程 <AppIcon name="arrowRight" :size="14" />
          </Button>
        </div>
      </template>
    </GeoPageIntro>

    <section class="geo-overview-compact" aria-label="诊断概览">
      <div class="geo-metric-strip">
        <span class="geo-metric">
          <span>数据更新</span><b>09/17 23:40</b>
        </span>
        <span class="geo-metric">
          <span>监测轮次</span><b>4 / 7</b>
        </span>
        <span class="geo-metric"><span>市场</span><b>德国 / 德语</b></span>
        <span class="geo-metric"><span>人设 / 意图</span><b>6 / 4</b></span>
        <span class="geo-metric"><span>Query / AI</span><b>67 / 5</b></span>
        <Tag class="geo-confidence" tone="green" variant="soft" size="sm">
          决策级可信度
        </Tag>
        <Button class="geo-pending-entry" variant="outline" :aria-label="`打开待处理事项，共 ${pendingCount} 项`" @click="emit('openPending')">
          <span class="geo-pending-icon" aria-hidden="true"><AppIcon name="check" :size="14" /></span><span>待处理</span><b v-if="pendingCount" class="geo-pending-badge">{{ pendingCount }}</b>
        </Button>
      </div>
    </section>

    <section class="geo-panel geo-audit-panel" aria-labelledby="audit-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="audit-title">
            <span class="geo-section-heading__number" aria-hidden="true">1</span>
            <span>官网 GEO 体检</span>
          </h2><span class="geo-muted">官网技术诊断不需要用户审核，确定性问题会直接生成任务；推送到官网后进入“待官网运营审核”。</span>
        </div><div class="geo-inline-tags">
          <Tag tone="green" variant="soft" size="sm">
            {{ passedCount }} 通过
          </Tag><Tag tone="red" variant="soft" size="sm">
            {{ auditChecks.length - passedCount }} 异常
          </Tag>
        </div>
      </header>
      <div class="geo-check-grid" role="tablist" aria-label="官网 GEO 检查项">
        <button v-for="(check, index) in auditChecks" :key="check.id" type="button" role="tab" class="geo-check" :class="{ 'is-alert': !check.passed, 'is-active': auditFilter === check.id }" :aria-selected="auditFilter === check.id" @click="openCheck(check)">
          <span class="geo-check-no">{{ ['①', '②', '③', '④', '⑤', '⑥', '⑦'][index] }}</span><span class="geo-check-name">{{ check.label }}</span><strong aria-hidden="true"><AppIcon :name="check.passed ? 'check' : 'warning'" :size="16" /></strong><span class="geo-check-tooltip"><b>{{ check.passed ? '通过' : '异常' }} · {{ check.label }}</b><small>{{ check.note }}</small></span>
        </button>
      </div>
      <div class="geo-audit-filter">
        <span><b>当前查看：</b>{{ activeAuditCheck ? `${['①', '②', '③', '④', '⑤', '⑥', '⑦'][Number(activeAuditCheck.id) - 1]} ${activeAuditCheck.label}` : '全部异常' }}</span>
        <Button v-if="auditFilter !== 'all'" variant="text" size="sm" @click="clearAuditFilter">
          查看全部异常
        </Button>
      </div>
      <div class="geo-finding-table-frame">
        <div class="geo-finding-head">
          <label v-if="canReview"><input :key="`${auditFilter}-${auditPage}`" type="checkbox" :checked="allSelected" :disabled="!actionableFindings.length" :indeterminate="pageSelectedCount > 0 && !allSelected" @change="emit('selectAllFindings', actionableFindings.map(finding => finding.id))"> 全选当前页</label><span v-else class="geo-muted">客户角色可查看诊断；审核由运营处理</span><div class="geo-finding-actions">
            <span v-if="canReview && selectedCount" class="geo-finding-selection-count" aria-live="polite">已选 {{ selectedCount }}</span>
            <Button v-if="canReview && selectedCount" class="geo-finding-approve-button geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('approveSelectedFindings')">
              审核通过并生成任务
            </Button>
          </div>
        </div>
        <div class="geo-diagnosis-table-scroll">
          <DataList
            class="geo-finding-table"
            :items="visibleFindings"
            :columns="findingColumns"
            :get-row-id="item => findingFromRow(item).id"
            :is-row-activatable="() => false"
            label="官网异常"
            :labels="tableLabels"
            empty-message="当前检查项没有异常"
            error-message="异常数据加载失败"
            density="compact"
          >
            <template #cell-select="{ item: finding }">
              <input v-if="canReview" :id="`finding-${findingFromRow(finding).id}`" type="checkbox" :checked="findingFromRow(finding).checked" :disabled="!isActionable(findingFromRow(finding))" :aria-label="`选择 ${findingFromRow(finding).title}`" @change="emit('selectFinding', findingFromRow(finding).id)">
            </template>
            <template #cell-finding="{ item: finding }">
              <label :for="`finding-${findingFromRow(finding).id}`" class="geo-finding-copy"><Tooltip :content="`${findingFromRow(finding).title} · ${displayObjectCodes(findingFromRow(finding).id)}`" :overflow-only="true"><strong>{{ findingFromRow(finding).title }} <small>{{ displayObjectCodes(findingFromRow(finding).id) }}</small></strong></Tooltip></label>
            </template>
            <template #cell-route="{ item: finding }">
              <span class="geo-chip geo-route-badge" :class="findingFromRow(finding).route">{{ findingRouteLabel(findingFromRow(finding)) }}</span>
            </template>
            <template #cell-check="{ item: finding }">
              <span class="geo-chip">{{ findingCheckLabel(findingFromRow(finding)) }}</span>
            </template>
            <template #cell-priority="{ item: finding }">
              <span class="geo-chip" :class="findingFromRow(finding).priority === 'P0' ? 'geo-chip--danger' : ''">{{ findingFromRow(finding).priority }}</span>
            </template>
            <template #cell-status="{ item: finding }">
              <span class="geo-finding-status" :class="{ 'is-done': findingStatusLabel(findingFromRow(finding)) === '已生成候选策略' || findingStatusLabel(findingFromRow(finding)) === '已修复', 'is-deferred': findingStatusLabel(findingFromRow(finding)) === '暂不修复' }">{{ findingStatusLabel(findingFromRow(finding)) }}</span>
            </template>
            <template #cell-actions="{ item: finding }">
              <Button class="geo-finding-detail-button geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('openAudit', findingFromRow(finding))">
                查看详情
              </Button>
            </template>
            <template #empty>
              <div class="geo-empty-state">
                <strong>当前检查项没有异常</strong><span>该检查项当前为通过状态，或所有异常已经处理。</span>
              </div>
            </template>
          </DataList>
        </div>
        <footer class="geo-diagnosis-pagination">
          <Pagination v-model="auditPage" :total="filteredFindings.length" :page-size="pageSize" size="sm" label="官网异常分页" previous-label="异常上一页" next-label="异常下一页" :page-label="page => `异常第 ${page} 页`" :summary-text="summaryText" :format-value="String" />
        </footer>
      </div>
    </section>

    <section class="geo-panel" aria-labelledby="persona-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="persona-title">
            <span class="geo-section-heading__number" aria-hidden="true">2</span>
            <span>买家人设 · 决策因子与认知 Gap</span>
          </h2>
        </div>
      </header>
      <div class="geo-personas" role="tablist" aria-label="买家人设">
        <button v-for="persona in personas" :key="persona.id" type="button" role="tab" :aria-selected="activePersona === persona.id" :class="{ 'is-active': activePersona === persona.id }" @click="emit('selectPersona', persona.id)">
          <strong>{{ persona.name }}</strong><small>{{ persona.gaps.length }} Gap</small>
        </button>
      </div>
      <div v-if="activePersonaData" class="geo-persona-body">
        <Card class="geo-radar-card">
          <div class="geo-card-head">
            <strong>{{ activePersonaData.name }} · 买家决策因子对比</strong><span>买家重视度 / 我方覆盖 / 竞品覆盖</span>
          </div><DeferredGeoRadarChart :factors="activePersonaData.factors" :title="activePersonaData.name" />
        </Card><PersonaGapCard :gaps="activeGapItems" />
      </div>
    </section>

    <section class="geo-panel geo-strategy-panel" aria-labelledby="strategy-title">
      <header class="geo-panel__head geo-panel__head--stacked">
        <div>
          <h2 id="strategy-title">
            <span class="geo-section-heading__number" aria-hidden="true">3</span>
            <span>候选策略</span>
            <span class="geo-help" title="候选策略由官网检测结果和 GEO 优化规则生成。">?</span>
          </h2>
          <div class="geo-candidate-guide">
            <p>
              <strong>候选策略由官网检测结果和 GEO 优化规则生成。</strong> 每条策略都关联具体的检测发现，并说明判断依据和建议处理方向。候选策略无需逐条审核；如需确认业务信息或执行范围，请在后续 Brief 中处理。 <span class="geo-candidate-link"><Button variant="text" size="xs" @click="emit('goOptimization')">
                查看任务 <AppIcon name="arrowRight" :size="14" />
              </Button></span>
            </p>
          </div>
        </div><div class="geo-queue-summary">
          <Tag tone="blue" variant="soft" size="sm">
            候选 {{ allStrategies.length }}
          </Tag><Tag tone="green" variant="soft" size="sm">
            已通过 {{ confirmedCount }}
          </Tag><Tag tone="orange" variant="soft" size="sm">
            待运营审核 {{ reviewCount }}
          </Tag>
        </div>
      </header>
      <div class="geo-strategy-context" role="status">
        <span>当前人设：{{ activePersonaData?.name ?? '全部' }}</span>
        <Tag v-if="selectedGap" tone="blue" variant="soft">
          聚焦：{{ selectedGap }}
        </Tag>
      </div>
      <div class="geo-strategy-toolbar">
        <div class="geo-tabs" role="tablist" aria-label="策略类型">
          <button v-for="layer in layers" :key="layer" type="button" role="tab" :aria-selected="strategyLayer === layer" :class="{ 'is-active': strategyLayer === layer }" @click="emit('setStrategyLayer', layer)">
            <span>{{ layer }}</span><small>{{ ` · ${layerCounts[layer]}` }}</small>
          </button>
        </div>
      </div>
      <div class="geo-strategy-table-scroll">
        <DataList
          class="geo-strategy-table"
          :items="visibleStrategies"
          :columns="strategyColumns"
          :get-row-id="item => strategyFromRow(item).id"
          :active-row-id="highlightedStrategy"
          :is-row-activatable="() => false"
          label="候选策略"
          :labels="tableLabels"
          empty-message="当前分类暂无策略"
          error-message="候选策略加载失败"
          density="compact"
        >
          <template #cell-id="{ item: strategy }">
            {{ strategyFromRow(strategy).id }}
          </template>
          <template #cell-priority="{ item: strategy }">
            <span class="geo-chip" :class="strategyFromRow(strategy).priority === 'P0' ? 'geo-chip--danger' : ''">{{ strategyFromRow(strategy).priority }}</span>
          </template>
          <template #cell-type="{ item: strategy }">
            <span class="geo-chip">{{ strategyFromRow(strategy).layer }}</span>
          </template>
          <template #cell-description="{ item: strategy }">
            <Tooltip :content="strategyFromRow(strategy).title" :overflow-only="true">
              <strong>{{ strategyFromRow(strategy).title }}</strong>
            </Tooltip>
          </template>
          <template #cell-source="{ item: strategy }">
            {{ strategyFromRow(strategy).source }}
          </template>
          <template #cell-factor="{ item: strategy }">
            <template v-if="strategyGaps(strategyFromRow(strategy)).length">
              <Button v-for="gap in strategyGaps(strategyFromRow(strategy))" :key="gap.name" class="geo-gap-link" variant="text" size="sm" :aria-pressed="selectedGap === gap.name" @click="focusGap(gap.name)">
                {{ gap.name }} · Gap {{ gap.value }}<AppIcon name="openExternal" :size="14" aria-hidden="true" />
              </Button>
            </template>
            <span v-else>当前人设不直接加权，仍按基础优先级保留</span>
          </template>
          <template #cell-status="{ item: strategy }">
            <Tag :tone="strategyFromRow(strategy).ignored ? 'neutral' : 'orange'" variant="soft" size="sm">
              {{ strategyCollaborationLabel(strategyFromRow(strategy)) }}
            </Tag>
          </template>
          <template #cell-actions="{ item: strategy }">
            <Button v-if="canReview && !strategyFromRow(strategy).confirmed && !strategyFromRow(strategy).ignored" class="geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('openStrategy', strategyFromRow(strategy))">
              查看详情
            </Button><Button v-else-if="taskFor(strategyFromRow(strategy))" class="geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('confirmStrategy', strategyFromRow(strategy))">
              查看任务
            </Button>
          </template>
          <template #empty>
            <div class="geo-empty-state">
              <strong>当前分类暂无策略</strong><span>切换其他策略分层，或先从官网 GEO 体检生成候选策略。</span>
            </div>
          </template>
        </DataList>
      </div>
      <footer class="geo-panel__foot">
        <span>同一条策略可以同时关联多个人设，但只生成一个执行任务；已进入优化中心的策略不会因后续监测波动自动覆盖。</span>
        <Pagination v-model="queuePage" :total="sortedStrategies.length" :page-size="pageSize" size="sm" label="候选策略分页" previous-label="策略上一页" next-label="策略下一页" :page-label="page => `策略第 ${page} 页`" :summary-text="summaryText" :format-value="String" />
      </footer>
    </section>
  </div>
</template>

<style scoped>
</style>

<style src="../../../styles/diagnosis-ui.css"></style>
