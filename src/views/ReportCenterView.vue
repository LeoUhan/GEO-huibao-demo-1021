<script setup lang="ts">
import type { ReportFilter, ReportRecord } from '../data/report-center-data'
import { computed, inject, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { generateLatestReport, getReportList, getReportQuota } from '../api/reports'
import ExpertReportDialog from '../components/report-center/ExpertReportDialog.vue'
import ExpertReportPreview from '../components/report-center/ExpertReportPreview.vue'
import GenerateLatestReportDialog from '../components/report-center/GenerateLatestReportDialog.vue'
import LatestReportCard from '../components/report-center/LatestReportCard.vue'
import ReportListPanel from '../components/report-center/ReportListPanel.vue'
import Toast from '../components/ui/ce/toast/Toast.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { useServerMarkets } from '../composables/use-server-markets'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { expertReportName, expertSummaryDefault, getExpertQuota, loadExpertReports, saveExpertFile, saveExpertReports, setExpertQuota } from '../data/expert-report-demo'
import { mapReportListItem } from '../data/report-api-adapters'
import { getDemoUserInfo } from '../mock/demo-user'
import { updateMockState } from '../mock/repository'
import { useGeoContextStore } from '../stores/geo-context'

const route = useRoute()
const geoContext = useGeoContextStore()
const workbench = inject(geoWorkbenchRouteContextKey, null)
const markets = useServerMarkets()
const role = computed(() => workbench?.role.value ?? 'ops')
const expertReports = shallowRef<ReportRecord[]>(loadExpertReports())
const expertQuota = shallowRef(getExpertQuota())
const expertDialogOpen = shallowRef(false)
const editingExpert = shallowRef<ReportRecord | null>(null)
const previewExpert = shallowRef<ReportRecord | null>(null)
const expertError = shallowRef('')
const scope = computed(() => {
  const market = markets.activeMarket.value
  return market ? `APW Waterjet · ${market.country} / ${market.language}` : 'APW Waterjet · 德国 / 德语'
})
const reports = shallowRef<ReturnType<typeof mapReportListItem>[]>([])
const remainingQuota = shallowRef<number | null>(null)
const quotaTotal = shallowRef(0)
const quotaLoaded = shallowRef(false)
const quotaError = shallowRef('')
const reportFilter = shallowRef<ReportFilter>('all')
const pageNum = shallowRef(1)
const pageSize = 10
const total = shallowRef(0)
const counts = shallowRef({ all: 0, weekly: 0, monthly: 0, quarterly: 0, adhoc: 0, expert: 0 })
const loading = shallowRef(false)
const listError = shallowRef('')
const generationDialogOpen = shallowRef(false)
const generationSubmitting = shallowRef(false)
const generationError = shallowRef('')
const pendingReport = shallowRef<ReportRecord | null>(null)
let generationTimer: ReturnType<typeof setTimeout> | undefined
const generationContext = shallowRef({ scopeLabel: '德国 × 德语', questionCount: 20, platformCount: 6 })
const toastOpen = shallowRef(false)
const toastMessage = shallowRef('')
const toastMessageId = shallowRef(0)
const toastVariant = shallowRef<'success' | 'warning' | 'error'>('success')
const userInfo = shallowRef(getDemoUserInfo())
const authReady = shallowRef(true)
const siteId = computed(() => parseSiteId(userInfo.value?.siteId))
const marketId = computed(() => parseMarketId(route.query.marketId) ?? geoContext.marketId)
const marketExpertReports = computed(() => expertReports.value.filter(report => report.expert?.marketId === marketId.value && (role.value === 'ops' || report.expert.delivery === 'delivered')))
const latestReport = computed(() => reports.value.find(report => report.type === 'adhoc') ?? reports.value[0] ?? null)
const visibleReports = computed(() => {
  if (reportFilter.value === 'expert')
    return [...marketExpertReports.value].sort((a, b) => b.date.localeCompare(a.date)).slice((pageNum.value - 1) * pageSize, pageNum.value * pageSize)
  if (reportFilter.value === 'all')
    return [...marketExpertReports.value, ...(pendingReport.value ? [pendingReport.value] : []), ...reports.value].sort((a, b) => b.date.localeCompare(a.date)).slice((pageNum.value - 1) * pageSize, pageNum.value * pageSize)
  return pendingReport.value && pageNum.value === 1 && reportFilter.value === 'adhoc' ? [pendingReport.value, ...reports.value].slice(0, pageSize) : reports.value
})
const visibleCounts = computed(() => ({ ...counts.value, all: counts.value.all + marketExpertReports.value.length + Number(!!pendingReport.value), adhoc: counts.value.adhoc + Number(!!pendingReport.value), expert: marketExpertReports.value.length }))
const visibleTotal = computed(() => reportFilter.value === 'expert' ? marketExpertReports.value.length : total.value + (reportFilter.value === 'all' ? marketExpertReports.value.length + Number(!!pendingReport.value) : reportFilter.value === 'adhoc' ? Number(!!pendingReport.value) : 0))
const canUploadExpert = computed(() => role.value === 'ops' && Boolean(marketId.value))
const deliveredMonths = computed(() => expertReports.value.filter(report => report.expert?.marketId === marketId.value && report.expert.delivery === 'delivered').map(report => report.expert!.month))
const canGenerate = computed(() => Boolean(
  siteId.value
  && marketId.value
  && quotaLoaded.value
  && !quotaError.value
  && !pendingReport.value
  && (quotaTotal.value === 0 || (remainingQuota.value !== null && remainingQuota.value > 0)),
))

function parseSiteId(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const id = value.trim()
  return id.length > 0 ? id : null
}

function parseMarketId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number')
    return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

let listRequestId = 0
async function refreshReports() {
  const nextPage = pageNum.value
  const requestId = ++listRequestId
  if (!authReady.value) {
    loading.value = true
    listError.value = ''
    return
  }
  loading.value = true
  listError.value = ''
  try {
    const result = await getReportList({
      pageNum: reportFilter.value === 'all' || reportFilter.value === 'expert' ? 1 : nextPage,
      pageSize: reportFilter.value === 'all' || reportFilter.value === 'expert' ? 100 : pageSize,
      reportType: reportFilter.value === 'adhoc' ? 'latest' : reportFilter.value === 'expert' ? 'all' : reportFilter.value,
    })
    if (requestId !== listRequestId)
      return
    reports.value = result.page.records.map(mapReportListItem)
    total.value = result.page.total
    counts.value = {
      all: result.counts.all,
      weekly: result.counts.weekly,
      monthly: result.counts.monthly,
      quarterly: result.counts.quarterly,
      adhoc: result.counts.latest,
      expert: 0,
    }
  }
  catch (error) {
    if (requestId !== listRequestId)
      return
    reports.value = []
    total.value = 0
    listError.value = error instanceof Error ? error.message : '报告列表加载失败'
  }
  finally {
    if (requestId === listRequestId)
      loading.value = false
  }
}
watch([authReady, pageNum, reportFilter], () => void refreshReports(), { immediate: true })

let quotaRequestId = 0
async function refreshQuota() {
  const nextSiteId = siteId.value
  const requestId = ++quotaRequestId
  if (!nextSiteId) {
    remainingQuota.value = null
    quotaLoaded.value = false
    quotaError.value = ''
    return
  }
  quotaError.value = ''
  quotaLoaded.value = false
  try {
    const quota = await getReportQuota(nextSiteId)
    if (requestId !== quotaRequestId)
      return
    quotaTotal.value = quota.monthlyLimit
    remainingQuota.value = quota.residueCount
    quotaLoaded.value = true
  }
  catch (error) {
    if (requestId === quotaRequestId) {
      quotaError.value = error instanceof Error ? error.message : '额度加载失败'
      quotaTotal.value = -1
      quotaLoaded.value = true
    }
  }
}
watch(siteId, () => void refreshQuota(), { immediate: true })

onMounted(() => {
  void markets.load()
  if (route.query.resetReportQuota !== '1')
    return
  updateMockState((draft) => {
    draft.reports.quota = 2
  })
  const url = new URL(window.location.href)
  url.searchParams.delete('resetReportQuota')
  window.history.replaceState(window.history.state, '', url)
  void refreshQuota()
})

function openGenerationDialog(context: typeof generationContext.value) {
  generationContext.value = context
  generationError.value = ''
  generationDialogOpen.value = true
}

async function submitLatestGeneration() {
  if (!siteId.value || !marketId.value || !canGenerate.value || generationSubmitting.value)
    return

  generationSubmitting.value = true
  generationError.value = ''
  try {
    const result = await generateLatestReport({ siteId: siteId.value, marketId: marketId.value })
    generationDialogOpen.value = false
    if (result.status === 0 || result.status === 1 || result.status === 2) {
      pendingReport.value = {
        id: `pending-${result.taskNo}`,
        type: 'adhoc',
        title: '最新监测次报',
        period: '本次采集',
        date: new Date().toISOString().slice(0, 10),
        summary: '正在采集并生成报告，完成后可在这里查看。',
        tags: [],
        sections: [],
        questionIds: [],
        status: 'generating',
      }
      reportFilter.value = 'all'
      pageNum.value = 1
      clearTimeout(generationTimer)
      // The local prototype completes immediately; keep the task visible to demonstrate the wait.
      generationTimer = setTimeout(async () => {
        await refreshReports()
        pendingReport.value = null
        toastMessage.value = '次报已生成，可在报告列表中查看。'
        toastVariant.value = 'success'
        toastMessageId.value += 1
        toastOpen.value = true
      }, 8000)
    }
    const taskMessages = {
      0: '生成任务已提交',
      1: '报告正在生成',
      2: '报告已生成',
      3: '报告生成失败',
      4: '生成任务已取消',
    } as const
    toastMessage.value = `${taskMessages[result.status]}：${result.taskNo}`
    toastVariant.value = result.status === 3 ? 'error' : result.status === 4 ? 'warning' : 'success'
    toastMessageId.value += 1
    toastOpen.value = true
    await refreshQuota()
    if (!pendingReport.value)
      await refreshReports()
  }
  catch (error) {
    generationError.value = error instanceof Error ? error.message : '报告生成任务提交失败，请稍后重试。'
  }
  finally {
    generationSubmitting.value = false
  }
}

function closeToast() {
  toastOpen.value = false
}

interface ExpertInput { id?: string, month: string, name: string, summary: string, file: File | null, fileName: string, format: 'html' | 'pdf' | null }

function openExpert(report: ReportRecord) {
  if (report.expert?.delivery === 'draft' && role.value === 'ops') {
    editingExpert.value = report
    expertError.value = ''
    expertDialogOpen.value = true
  }
  else {
    previewExpert.value = report
  }
}

function notifyExpert(message: string) {
  toastMessage.value = message
  toastVariant.value = 'success'
  toastMessageId.value += 1
  toastOpen.value = true
}

async function persistExpert(value: ExpertInput, deliver: boolean) {
  if (!marketId.value || role.value !== 'ops')
    return
  expertError.value = ''
  if (deliver && expertQuota.value <= 0) {
    expertError.value = '运营专家报告权益不足。'
    return
  }
  if (deliver && deliveredMonths.value.includes(value.month)) {
    expertError.value = '该月份已有已交付报告。'
    return
  }
  const id = value.id ?? `expert-${marketId.value}-${value.month}-${Date.now()}`
  try {
    if (value.file)
      await saveExpertFile(id, value.file)
    const now = new Date().toISOString().slice(0, 10)
    const item: ReportRecord = {
      id,
      type: 'expert',
      title: `APW Waterjet · ${value.month.slice(0, 4)} 年 ${Number(value.month.slice(5))} 月 ${value.name || expertReportName}`,
      period: `${value.month.slice(0, 4)} 年 ${Number(value.month.slice(5))} 月`,
      date: now,
      summary: deliver ? value.summary || expertSummaryDefault : '本月诊断报告尚未提交，客户暂不可见。',
      tags: deliver ? ['月度诊断', (value.format ?? 'html').toUpperCase()] : ['待交付', ...(value.fileName ? [(value.format ?? 'html').toUpperCase()] : [])],
      sections: [],
      questionIds: [],
      status: 'generated',
      expert: { marketId: marketId.value, month: value.month, fileName: value.fileName, format: value.format ?? 'html', delivery: deliver ? 'delivered' : 'draft', deliveredAt: deliver ? now : undefined, draftSummary: deliver ? undefined : value.summary },
    }
    const next = [item, ...expertReports.value.filter(report => report.id !== id)]
    saveExpertReports(next)
    expertReports.value = next
    if (deliver) {
      setExpertQuota(expertQuota.value - 1)
      expertQuota.value -= 1
    }
    expertDialogOpen.value = false
    editingExpert.value = null
    reportFilter.value = 'expert'
    pageNum.value = 1
    notifyExpert(deliver ? '报告已交付，客户现在可以查看。' : '草稿已保存，客户暂不可见。')
  }
  catch {
    expertError.value = '保存演示文件失败，请检查浏览器存储空间后重试。'
  }
}

onBeforeUnmount(() => {
  clearTimeout(generationTimer)
  toastOpen.value = false
})

function changeFilter(filter: ReportFilter) {
  reportFilter.value = filter
  pageNum.value = 1
}

watch([role, marketId], () => {
  // Seeded reports are prototype fixtures. Bind them to the first active market
  // so the operator flow remains demonstrable regardless of the API's market IDs.
  if (role.value === 'ops' && marketId.value && !expertReports.value.some(report => report.expert?.marketId === marketId.value)) {
    const onlySeedReports = expertReports.value.length > 0 && expertReports.value.every(report => report.id.startsWith('expert-demo-'))
    if (onlySeedReports) {
      const scopedReports = expertReports.value.map(report => ({
        ...report,
        expert: report.expert ? { ...report.expert, marketId: marketId.value! } : undefined,
      }))
      saveExpertReports(scopedReports)
      expertReports.value = scopedReports
    }
  }
  if (reportFilter.value === 'expert' && !marketExpertReports.value.length)
    reportFilter.value = 'all'
}, { immediate: true })
</script>

<template>
  <main class="report-center-view">
    <GeoPageIntro title="报告中心" help-label="报告中心说明" description="集中查看次报、周报、月报与季报；次报由用户点击「生成最新报告」后触发生成。" />

    <LatestReportCard
      :report="latestReport"
      :remaining="remainingQuota"
      :quota-total="quotaTotal"
      :quota-ready="quotaLoaded"
      :can-generate="canGenerate && !generationSubmitting"
      @generate="openGenerationDialog"
    />
    <p v-if="quotaError" class="quota-error" role="status">
      报告额度暂不可用：{{ quotaError }}
    </p>
    <ReportListPanel
      :model-value="reportFilter"
      :reports="visibleReports"
      :counts="visibleCounts"
      :page-num="pageNum"
      :page-size="pageSize"
      :total="visibleTotal"
      :loading="loading"
      :error="listError"
      :site-id="siteId"
      :market-id="marketId"
      :role="role"
      :show-expert-filter="marketExpertReports.length > 0"
      :can-upload-expert="canUploadExpert"
      @update:model-value="changeFilter"
      @change-page="pageNum = $event"
      @upload-expert="editingExpert = null; expertError = ''; expertDialogOpen = true"
      @open-expert="openExpert"
    />

    <ExpertReportDialog
      :open="expertDialogOpen"
      :report="editingExpert"
      :scope="scope"
      :remaining="expertQuota"
      :delivered-months="deliveredMonths"
      :error="expertError"
      @close="expertDialogOpen = false"
      @save="persistExpert($event, false)"
      @deliver="persistExpert($event, true)"
    />
    <ExpertReportPreview :report="previewExpert" @close="previewExpert = null" />

    <GenerateLatestReportDialog
      v-model:open="generationDialogOpen"
      :scope-label="generationContext.scopeLabel"
      :question-count="generationContext.questionCount"
      :platform-count="generationContext.platformCount"
      :remaining="remainingQuota"
      :unlimited="quotaLoaded && quotaTotal === 0"
      :loading="generationSubmitting"
      :error="generationError"
      @confirm="submitLatestGeneration"
    />
    <Toast :open="toastOpen" :message-id="toastMessageId" :variant="toastVariant" close-label="关闭提示" @close="closeToast">
      {{ toastMessage }}
    </Toast>
  </main>
</template>

<style scoped>
.report-center-view { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; color: var(--text-primary); }
.quota-error { margin: -16px 0 0; color: var(--status-error-foreground, #b91c1c); font-size: 12px; }
@media (max-width: 760px) { .report-center-view { gap: var(--space-6); } }
</style>
