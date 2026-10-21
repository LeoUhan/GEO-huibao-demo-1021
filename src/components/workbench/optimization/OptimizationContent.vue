<script setup lang="ts">
import type { GeoTask, Strategy, TaskFilter, UserRole } from '../../../data/geo-data'
import type { DataListColumn } from '../../ui/ce/data-list/types'
import { computed, shallowRef, watch } from 'vue'
import { displayObjectCodes } from '../../../data/geo-data'
import { getTaskBucket, isTaskIgnored, taskStageLabel } from '../../../workflows/task-workflow'
import Button from '../../ui/ce/button/Button.vue'
import ActionCard from '../../ui/ce/card/ActionCard.vue'
import DataList from '../../ui/ce/data-list/DataList.vue'
import Pagination from '../../ui/ce/pagination/Pagination.vue'
import SegmentedControl from '../../ui/ce/segmented-control/SegmentedControl.vue'
import Tag from '../../ui/ce/tag/Tag.vue'
import GeoPageIntro from '../shared/GeoPageIntro.vue'
import '../../../styles/optimization-page.css'

const props = defineProps<{ tasks: GeoTask[], allTasks: GeoTask[], strategies?: Strategy[], filter: TaskFilter, role: UserRole }>()
const emit = defineEmits<{ setFilter: [filter: TaskFilter], openTask: [task: GeoTask], openFlow: [] }>()

type BucketFilter = 'all' | 'brief' | 'brief_changes' | 'executing' | 'review' | 'website' | 'done' | 'ignored'
const taskTypes: Array<{ id: TaskFilter, label: string }> = [
  { id: 'all', label: '全部任务' },
  { id: 'web', label: '官网内容' },
  { id: 'external', label: '外部内容' },
  { id: 'repair', label: '基础修复' },
]
const bucket = shallowRef<BucketFilter>('all')
const page = shallowRef(1)
const perPage = 5
const taskTypeOptions = taskTypes.map(item => ({ value: item.id, label: item.label }))
const taskStatusOptions: Array<{ value: BucketFilter, label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'brief', label: '待确认 Brief' },
  { value: 'brief_changes', label: 'Brief 待调整' },
  { value: 'executing', label: '执行中' },
  { value: 'review', label: '待结果审核' },
  { value: 'website', label: '官网协同中' },
  { value: 'done', label: '已完成' },
  { value: 'ignored', label: '已忽略' },
]
const taskColumns: DataListColumn<unknown>[] = [
  { key: 'serial', title: '序号', width: '4%', minWidth: 44 },
  { key: 'task', title: '任务', width: '35%', minWidth: 300 },
  { key: 'type', title: '任务类型', width: '17%', minWidth: 140 },
  { key: 'source', title: '来源', width: '13%', minWidth: 100 },
  { key: 'status', title: '任务状态', width: '22%', minWidth: 190 },
  { key: 'actions', title: '操作', width: '9%', minWidth: 112 },
]
const taskTableLabels = {
  bulkActions: '任务批量操作',
  selectedCount: (count: number) => `已选择 ${count} 项`,
  clearSelection: '取消选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部任务',
  loading: '任务加载中',
  retry: '重试',
  selectRow: (label: string) => `选择任务 ${label}`,
}
const filteredTasks = computed(() => props.allTasks.filter(task => (props.filter === 'all' || task.type === props.filter) && (bucket.value === 'all' || getTaskBucket(task) === bucket.value)))
const pages = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / perPage)))
const visibleTasks = computed(() => filteredTasks.value.slice((page.value - 1) * perPage, page.value * perPage))
function taskFromRow(item: unknown) {
  return item as GeoTask
}
function taskSerial(task: GeoTask) {
  return filteredTasks.value.findIndex(item => item.id === task.id) + 1
}
function taskPageSummary({ total, page, pages }: { total: number, page: number, pages: number }) {
  return `共 ${total} 条 · 第 ${page} / ${pages} 页`
}
function isBriefChange(task: GeoTask) {
  return task.progress === 'brief' && task.workflow?.briefStatus === 'changes_requested'
}
function isIgnored(task: GeoTask) {
  return isTaskIgnored(task)
}
const cards = computed(() => {
  const items = props.allTasks
  return props.role === 'ops'
    ? [
        { title: 'Task 草稿', note: '候选策略由 Agent 自动整理后创建', tasks: items.filter(task => task.progress === 'brief' && !isBriefChange(task) && !isIgnored(task)), count: items.filter(task => task.progress === 'brief' && !isBriefChange(task) && !isIgnored(task)).length, bucket: 'brief' as BucketFilter },
        { title: '客户要求调整', note: '根据反馈重新整理 Task Brief', tasks: items.filter(task => isBriefChange(task) && !isIgnored(task)), count: items.filter(task => isBriefChange(task) && !isIgnored(task)).length, bucket: 'brief_changes' as BucketFilter },
        { title: '正式执行任务', note: 'Brief 已确认，进入执行流程', tasks: items.filter(task => ['todo', 'running'].includes(task.progress)), count: items.filter(task => ['todo', 'running'].includes(task.progress)).length, bucket: 'executing' as BucketFilter },
      ]
    : [
        { title: '待确认 Task Brief', note: '确认执行目标、范围与关键业务事实', tasks: items.filter(task => task.progress === 'brief' && !isBriefChange(task) && !isIgnored(task)), count: items.filter(task => task.progress === 'brief' && !isBriefChange(task) && !isIgnored(task)).length, bucket: 'brief' as BucketFilter },
        { title: '待处理调整', note: '你已提出调整，等待 Agent 重新整理', tasks: items.filter(task => isBriefChange(task) && !isIgnored(task)), count: items.filter(task => isBriefChange(task) && !isIgnored(task)).length, bucket: 'brief_changes' as BucketFilter },
        { title: '已进入执行', note: 'Brief 已确认并进入正式执行', tasks: items.filter(task => ['todo', 'running'].includes(task.progress)), count: items.filter(task => ['todo', 'running'].includes(task.progress)).length, bucket: 'executing' as BucketFilter },
      ]
})
watch([bucket, () => props.filter], () => page.value = 1)
watch(pages, (value) => {
  if (page.value > value)
    page.value = value
})
function openCard(taskCard: typeof cards.value[number]) {
  bucket.value = taskCard.bucket
  emit('setFilter', 'all')
  page.value = 1
  if (taskCard.tasks.length === 1)
    emit('openTask', taskCard.tasks[0]!)
  else document.getElementById('geo-task-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function taskTypeLabel(task: GeoTask) {
  return task.type === 'web' ? '官网内容' : task.type === 'external' ? '外部内容' : '技术修复'
}
function sourceLabel(task: GeoTask) {
  const source = task.source.split(/[·/]/)[0]?.trim() || task.source
  return displayObjectCodes(source)
}
function setTaskFilter(value: string) {
  emit('setFilter', value as TaskFilter)
}
function setTaskStatus(value: string) {
  bucket.value = value as BucketFilter
}
</script>

<template>
  <div class="geo-content geo-optimization">
    <GeoPageIntro variant="workbench" title="优化中心 · 任务工作台" help-label="优化中心说明" description="每个问题分别创建独立 Task；Brief 是 Task 的第一个确认阶段，确认后进入正式执行。" />

    <section class="geo-optimization-overview" aria-label="任务概览与待办">
      <div class="geo-optimization-section-head">
        <h2>数据总览</h2>
      </div>
      <div class="geo-overview-grid">
        <div
          v-for="stat in [
            { name: '全部任务', count: allTasks.length },
            { name: '官网内容', count: allTasks.filter(task => task.type === 'web').length },
            { name: '外部内容', count: allTasks.filter(task => task.type === 'external').length },
            { name: '基础修复', count: allTasks.filter(task => task.type === 'repair').length },
          ]" :key="stat.name" class="geo-stat-card"
        >
          <strong>{{ stat.count }}<small>项</small></strong><span>{{ stat.name }}</span>
        </div>
      </div>
      <div class="geo-optimization-section-head geo-optimization-section-head--actions">
        <h2>今天需要你处理</h2>
        <span>自动聚合当前任务里需要人工确认的事项</span>
      </div>
      <div class="geo-action-grid">
        <ActionCard v-for="card in cards" :key="card.title" class="geo-action-card" :class="{ 'has-pending': card.count, 'is-static': !card.tasks.length }" :disabled="!card.tasks.length" @click="openCard(card)">
          <strong class="geo-action-card__title">{{ card.title }}</strong><span class="geo-action-card__note">{{ card.note }}</span>
          <span class="geo-action-card__foot"><small>当前 <strong>{{ card.count }}</strong> 项</small><span>{{ card.count ? '需要处理' : '暂无待办' }}</span></span>
        </ActionCard>
      </div>
    </section>

    <section class="geo-panel geo-task-panel" aria-labelledby="geo-task-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="geo-task-title">
            Task 草稿与执行任务
          </h2><p>Task 从一开始就存在；Brief 只是任务的第一个阶段</p>
        </div><Tag tone="blue" variant="soft" size="sm">
          {{ filteredTasks.length }} 项
        </Tag>
      </header>
      <div class="geo-task-filter-row">
        <strong>任务类型</strong>
        <SegmentedControl class="geo-filter-options" :model-value="filter" :options="taskTypeOptions" variant="filter" aria-label="任务类型筛选" @update:model-value="setTaskFilter" />
      </div>
      <div class="geo-task-filter-row">
        <strong>任务状态</strong>
        <SegmentedControl class="geo-filter-options" :model-value="bucket" :options="taskStatusOptions" variant="filter" aria-label="任务状态筛选" @update:model-value="setTaskStatus" />
      </div>
      <div class="geo-task-table-wrap">
        <DataList
          class="geo-task-table"
          border
          :items="visibleTasks"
          :columns="taskColumns"
          :get-row-id="item => taskFromRow(item).id"
          :is-row-activatable="() => false"
          label="优化中心任务列表"
          :labels="taskTableLabels"
          empty-message="暂无任务。确认 Brief 后，任务会进入这里。"
          error-message="任务加载失败"
          :show-footer-when-empty="true"
          density="compact"
        >
          <template #cell-serial="{ item }">
            {{ taskSerial(taskFromRow(item)) }}
          </template>
          <template #cell-task="{ item }">
            <strong>{{ taskFromRow(item).name }}</strong><small>{{ taskFromRow(item).id }}</small>
          </template>
          <template #cell-type="{ item }">
            <span class="geo-method">{{ taskTypeLabel(taskFromRow(item)) }}</span>
          </template>
          <template #cell-source="{ item }">
            {{ sourceLabel(taskFromRow(item)) }}
          </template>
          <template #cell-status="{ item }">
            <span class="geo-progress" :class="`geo-progress--${taskFromRow(item).progress}`">{{ taskStageLabel(taskFromRow(item)) }}</span>
          </template>
          <template #cell-actions="{ item }">
            <Button class="geo-task-detail-button geo-table-detail-button" size="sm" @click="emit('openTask', taskFromRow(item))">
              查看详情
            </Button>
          </template>
          <template #footer>
            <Pagination
              v-if="pages > 1"
              v-model="page"
              class="geo-task-pagination"
              size="sm"
              :total="filteredTasks.length"
              :page-size="perPage"
              label="任务分页"
              previous-label="任务上一页"
              next-label="任务下一页"
              :page-label="current => `任务第 ${current} 页`"
              :summary-text="taskPageSummary"
              :format-value="String"
            />
          </template>
        </DataList>
      </div>
    </section>
  </div>
</template>
