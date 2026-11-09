<script setup lang="ts">
import type { CitedPage, MonitoringPlatformId, MonitoringQuestion, SourceDomain } from '../../../data/visibility-monitoring-data'
import { computed, nextTick, shallowRef, watch } from 'vue'
import { visibilityMonitoringData } from '../../../data/visibility-monitoring-data'
import MonitoringEChart from '../analysis/MonitoringEChart.vue'
import { createTrendOption } from '../analysis/chart-options'
import MetricDefinitionButton from '../../overview/MetricDefinitionButton.vue'
import Drawer from '../../ui/ce/drawer/Drawer.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'
import { getQuestionSummary } from './question-view-model'

const props = defineProps<{
  question: MonitoringQuestion | null
  open: boolean
  platforms: readonly { id: MonitoringPlatformId, label: string }[]
  pages?: readonly CitedPage[]
  sources?: readonly SourceDomain[]
  brand?: string
}>()
const emit = defineEmits<{
  close: []
  selectSource: [sourceId: string]
}>()

const selectedBatchId = shallowRef<string | null>(null)
const batchStrip = shallowRef<HTMLElement | null>(null)
const expandedPlatform = shallowRef<MonitoringPlatformId | null>(null)
const pages = computed(() => props.pages ?? visibilityMonitoringData.citedPages)
const sources = computed(() => props.sources ?? visibilityMonitoringData.sources)
const batches = computed(() => props.question?.samplingBatches ?? [])
const selectedBatchIndex = computed(() => batches.value.findIndex(batch => batch.id === selectedBatchId.value))
const platformResults = computed(() => {
  const question = props.question
  const results = question?.batchResults && selectedBatchId.value
    ? question.batchResults[selectedBatchId.value]
    : question?.platformResults
  return (results ?? []).filter(result => result.platform !== 'perplexity')
})
const trendOption = computed(() => createTrendOption({ weeks: props.question?.trendWeeks ?? [], series: (props.question?.platformTrends ?? []).filter(series => series.id !== 'perplexity') }))
const summary = computed(() => props.question ? getQuestionSummary(props.question) : null)
const totalResponses = computed(() => props.question?.samplingSummary?.total ?? props.question?.samplingBatches.reduce((total, batch) => total + batch.totalResponses, 0) ?? 0)
const validResponses = computed(() => props.question?.samplingSummary?.valid ?? props.question?.samplingBatches.reduce((total, batch) => total + batch.validResponses, 0) ?? 0)
const samplingRange = computed(() => {
  const batches = props.question?.samplingBatches ?? []
  return batches.length ? `${batches[0]!.date} 至 ${batches[batches.length - 1]!.date}` : '暂无采样范围'
})
const mentionRows = computed(() => {
  const question = props.question
  if (!question)
    return []
  const currentResults = question.platformResults.filter(result => result.platform !== 'perplexity')
  const total = currentResults.length
  const rows = [{
    name: props.brand ?? visibilityMonitoringData.overview.brand,
    type: '我方品牌',
    hits: currentResults.filter(result => result.ownBrandMentioned).length,
  }, ...question.competitors.map(name => ({
    name,
    type: '竞品',
    hits: currentResults.filter(result => result.competitorsMentioned.includes(name)).length,
  }))]
  return rows.map(row => ({ ...row, rate: total ? Math.round(row.hits / total * 100) : 0, total }))
})
const citedPages = computed(() => {
  const question = props.question
  if (!question)
    return []
  const allResults = (question.batchResults ? Object.values(question.batchResults).flat() : question.platformResults).filter(result => result.platform !== 'perplexity')
  const pageIds = [...new Set(allResults.flatMap(result => result.citedPages))]
  return pageIds.map((id) => {
    const page = pages.value.find(item => item.id === id)
    const domain = sources.value.find(item => item.id === page?.domainId)
    const platformIds = allResults.filter(result => result.citedPages.includes(id)).map(result => result.platform)
    return { id, title: page?.title ?? id, domain: domain?.domain ?? '未知域名', platformIds: [...new Set(platformIds)] }
  })
})

async function selectBatch(index: number) {
  const batch = batches.value[index]
  if (!batch || batch.id === selectedBatchId.value)
    return

  selectedBatchId.value = batch.id
  expandedPlatform.value = platformResults.value[0]?.platform ?? null
  await nextTick()
  const strip = batchStrip.value
  const active = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (strip && active) {
    const view = strip.getBoundingClientRect()
    const item = active.getBoundingClientRect()
    strip.scrollLeft += Math.min(0, item.left - view.left) + Math.max(0, item.right - view.right)
  }
}

function openSnapshot(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', '')
  frame.title = '回答 HTML 快照'
  frame.srcdoc = html
  frame.style.cssText = 'display:block;width:100vw;height:100vh;border:0'
  const preview = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>回答 HTML 快照</title><body style="margin:0">${frame.outerHTML}</body></html>`
  const url = URL.createObjectURL(new Blob([preview], { type: 'text/html;charset=utf-8' }))
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function platformName(id: MonitoringPlatformId) {
  return props.platforms.find(platform => platform.id === id)?.label ?? id
}

watch([() => props.question?.id, () => props.open, batches], () => {
  selectedBatchId.value = batches.value[0]?.id ?? null
  expandedPlatform.value = platformResults.value[0]?.platform ?? null
  if (batchStrip.value)
    batchStrip.value.scrollLeft = 0
}, { immediate: true })
</script>

<template>
  <Drawer
    :open="open"
    :title="question?.question ?? '选中问题详情'"
    eyebrow="选中问题详情"
    :description="question ? `买家人设：${question.persona}  |  当前总位次：${question.rank ? `第 ${question.rank} 位${question.rankTotal ? ` / 共 ${question.rankTotal} 个` : ''}` : '未进入排名'}` : undefined"
    :size="1080"
    close-label="关闭问题详情"
    class="vm-question-drawer"
    @close="emit('close')"
    @update:open="value => !value && emit('close')"
  >
    <div v-if="question" class="vm-question-body">
      <section class="vm-drawer-section">
        <div class="vm-drawer-section__heading">
          <div>
            <h3>问题综合表现</h3>
            <p>该问题在当前监测结果中的整体表现</p>
          </div>
          <span class="vm-section-kicker">{{ question.id }} · {{ question.type }}</span>
        </div>
        <div class="vm-detail-metrics">
          <article><span>命中 AI 平台</span><strong>{{ summary?.platformHits }} / {{ question.platformResults.filter(result => result.platform !== 'perplexity').length }}</strong><small>{{ question.platformResults.filter(result => result.platform !== 'perplexity').map(result => platformName(result.platform)).join(' · ') }}</small></article>
          <article><span>我方提及率 <MetricDefinitionButton id="soa" /></span><strong>{{ summary?.ownMentionRate }}%</strong><small>按当前平台结果统计</small></article>
          <article><span>我方官网引用率 <MetricDefinitionButton id="officialCitation" /></span><strong>{{ summary?.citationRate }}%</strong><small>引用我方官网的有效回答占比</small></article>
          <article><span>平均位次 <MetricDefinitionButton id="rank" /></span><strong>{{ summary?.averageRank ?? '—' }}</strong><small>仅统计有排名结果</small></article>
          <article><span>情感分布</span><strong class="metric-sentiment">{{ summary?.sentiment.positive }} / {{ summary?.sentiment.neutral }} / {{ summary?.sentiment.negative }}</strong><small>正向 · 中性 · 负向</small></article>
          <article><span>提及竞品</span><strong class="metric-competitors">{{ summary?.competitors.join('、') || '未提及' }}</strong><small>按当前平台结果统计</small></article>
        </div>
      </section>

      <section class="vm-drawer-section">
        <div class="vm-drawer-section__heading">
          <div>
            <h3>问题采样</h3>
            <p>该问题在本轮监测中的累计采样情况</p>
          </div>
          <span class="vm-section-kicker">{{ question.samplingSummary?.batches ?? question.samplingBatches.length }} 次采集</span>
        </div>
        <div class="vm-detail-metrics">
          <article><span>累计采集批次</span><strong>{{ question.samplingSummary?.batches ?? question.samplingBatches.length }} 次</strong><small>该问题累计执行次数</small></article>
          <article><span>有效回答</span><strong>{{ validResponses }} / {{ totalResponses }}</strong><small>有效回答 / 总回答</small></article>
          <article><span>累计采样范围</span><strong class="metric-range">{{ samplingRange }}</strong><small>当前统计时间范围</small></article>
        </div>
      </section>

      <section class="vm-drawer-section">
        <div class="vm-drawer-section__heading">
          <div><h3>品牌提及表现</h3><p>该问题累计采样中的品牌提及情况</p></div>
        </div>
        <div class="vm-table-scroll" role="region" tabindex="0" aria-label="品牌提及表现表，可横向滚动">
          <table>
            <thead><tr><th>品牌</th><th>类型</th><th>提及率 <MetricDefinitionButton id="soa" /></th><th>提及次数</th></tr></thead>
            <tbody>
              <tr v-for="row in mentionRows" :key="row.name">
                <th scope="row">
                  {{ row.name }}
                </th><td><span class="vm-type-pill">{{ row.type }}</span></td><td><strong>{{ row.rate }}%</strong></td><td>{{ row.hits }} / {{ row.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="vm-drawer-section">
        <div class="vm-drawer-section__heading">
          <div><h3>提及度变化趋势</h3><p>按采样批次查看 AI 平台提及率变化</p></div>
        </div>
        <MonitoringEChart v-if="question.platformTrends?.length" :option="trendOption" label="问题在各 AI 平台的提及度变化趋势" />
        <div v-else class="vm-trend-empty" role="status">
          <span class="vm-trend-empty__icon" aria-hidden="true"><AppIcon name="chart" :size="20" /></span>
          <div><strong>暂缺平台级历史趋势</strong><p>当前演示数据仅包含最新平台结果和批次采样量，不提供逐批次平台提及率，因此不绘制推算曲线。</p></div>
        </div>
      </section>

      <section class="vm-drawer-section">
        <div class="vm-drawer-section__heading">
          <div><h3>引用页面</h3><p>该问题在本轮回答中引用的来源页面</p></div>
          <span class="vm-section-kicker">{{ citedPages.length }} 个页面</span>
        </div>
        <div v-if="citedPages.length" class="vm-table-scroll" role="region" tabindex="0" aria-label="引用页面列表，可横向滚动">
          <table>
            <thead><tr><th>来源域名</th><th>页面标题 / 摘要</th><th>引用平台</th><th>详情</th></tr></thead>
            <tbody>
              <tr v-for="page in citedPages" :key="page.id">
                <td>{{ page.domain }}</td><td>{{ page.title }}</td><td>{{ page.platformIds.map(platformName).join(' · ') }}</td><td>
                  <button class="vm-link geo-table-detail-button" type="button" :data-cited-page="page.id" @click="emit('selectSource', page.id)">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="vm-inline-empty">
          暂无引用页面
        </p>
      </section>

      <section class="vm-drawer-section vm-answers-section">
        <div class="vm-drawer-section__heading">
          <h3>回答明细</h3>
          <p>{{ question.batchResults ? '采集批次只影响此处的原始回答' : '当前监测快照中的平台原始回答' }}</p>
        </div>
        <div v-if="question.batchResults && batches.length" class="vm-batches">
          <span class="vm-batches__label">采集批次</span>
          <nav ref="batchStrip" class="vm-batch-tabs" aria-label="采集批次">
            <button
              v-for="(batch, index) in batches"
              :key="batch.id"
              type="button"
              :data-batch-id="batch.id"
              :aria-pressed="selectedBatchId === batch.id"
              @click="selectBatch(index)"
            >
              <strong>第 {{ index + 1 }} 次采集</strong><span>{{ batch.date }}</span>
            </button>
          </nav>
          <div v-if="batches.length > 3" class="vm-batch-controls">
            <button type="button" aria-label="上一次采集" :disabled="selectedBatchIndex <= 0" @click="selectBatch(selectedBatchIndex - 1)">
              <AppIcon name="chevronLeft" :size="16" />
            </button>
            <select aria-label="跳转到指定采集批次" :value="selectedBatchIndex" @change="selectBatch(Number(($event.target as HTMLSelectElement).value))">
              <option v-for="(batch, index) in batches" :key="batch.id" :value="index">
                {{ index + 1 }} / {{ batches.length }}
              </option>
            </select>
            <button type="button" aria-label="下一次采集" :disabled="selectedBatchIndex >= batches.length - 1" @click="selectBatch(selectedBatchIndex + 1)">
              <AppIcon name="chevronRight" :size="16" />
            </button>
          </div>
        </div>
        <div v-if="platformResults.length" class="vm-answer-list">
          <details v-for="result in platformResults" :key="`${selectedBatchId}-${result.platform}`" class="vm-answer" :open="expandedPlatform === result.platform">
            <summary @click.prevent="expandedPlatform = expandedPlatform === result.platform ? null : result.platform">
              <span class="vm-platform-mark" :class="`is-${result.platform}`">{{ result.platform === 'chatgpt' ? '◎' : platformName(result.platform).slice(0, 1) }}</span>
              <strong>{{ platformName(result.platform) }}</strong>
              <span class="vm-answer-status" :class="result.ownBrandMentioned ? 'is-mentioned' : 'is-not-mentioned'">{{ result.ownBrandMentioned ? '已提及' : '未提及' }}</span>
              <span class="vm-answer-preview">{{ result.answer }}</span>
              <AppIcon class="vm-answer-chevron" name="chevronDown" :size="16" aria-hidden="true" />
            </summary>
            <div class="vm-answer__body">
              <div class="vm-answer-toolbar">
                <div class="vm-answer-tags">
                  <span>{{ result.sentiment === 'positive' ? '情感：正面正向' : result.sentiment === 'negative' ? '情感：负向' : '情感：中性' }}</span>
                  <span v-if="result.rank" class="vm-answer-tag--positive">第 {{ result.rank }} 位</span>
                </div>
                <button v-if="result.htmlSnapshot" type="button" class="vm-snapshot-button" @click="openSnapshot(result.htmlSnapshot)">
                  查看 HTML 快照 <AppIcon name="openExternal" :size="14" />
                </button>
              </div>
              <p class="vm-answer__label">
                平台返回原文
              </p>
              <blockquote tabindex="0" aria-label="平台返回原文">{{ result.answer }}</blockquote>
              <div v-if="result.citedPages.length" class="vm-answer__citations">
                <span>引用页面</span><button v-for="pageId in result.citedPages" :key="pageId" type="button" class="vm-link" :data-cited-page="pageId" @click="emit('selectSource', pageId)">
                  {{ pages.find(page => page.id === pageId)?.title ?? pageId }} <AppIcon name="openExternal" :size="14" aria-hidden="true" />
                </button>
              </div>
            </div>
          </details>
        </div>
        <p v-else class="vm-inline-empty">
          暂无平台回答
        </p>
      </section>
    </div>
  </Drawer>
</template>

<style scoped>
:global(.vm-question-drawer .ce-drawer-header) { background: var(--background-subtle); }
:global(.vm-question-drawer .ce-drawer-eyebrow) { color: var(--action-accent); }
:global(.vm-question-drawer .ce-drawer-heading h2:focus) { outline: none; }
.vm-question-body { display: grid; gap: 18px; min-width: 0; }
.vm-drawer-section { min-width: 0; padding: 18px; border: 1px solid var(--border-default); border-radius: 13px; background: var(--background-primary); }
.vm-drawer-section__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.vm-drawer-section__heading h3 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-drawer-section__heading p { margin: 4px 0 0; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.vm-section-kicker { flex: 0 0 auto; padding: 5px 9px; border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; }
.vm-detail-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.vm-detail-metrics article { display: grid; min-width: 0; align-content: start; gap: 7px; padding: 14px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); }
.vm-detail-metrics article > span { color: var(--text-muted); font-size: 12px; }
.vm-detail-metrics strong { color: var(--text-primary); font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.vm-detail-metrics small { color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.vm-detail-metrics .metric-sentiment { font-size: 16px; }
.vm-detail-metrics .metric-competitors { font-size: 15px; }
.vm-detail-metrics .metric-range { font-size: 14px; }
.vm-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.vm-table-scroll:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.vm-table-scroll table { width: 100%; min-width: 560px; border-collapse: collapse; text-align: left; }
.vm-table-scroll th, .vm-table-scroll td { padding: 11px 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
.vm-table-scroll thead { color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; }
.vm-table-scroll tbody tr:last-child th, .vm-table-scroll tbody tr:last-child td { border-bottom: 0; }
.vm-table-scroll tbody th { font-weight: 650; }
.vm-type-pill { padding: 4px 8px; border-radius: 999px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 10%, white); font-size: 12px; }
.vm-link { padding: 0; border: 0; color: var(--action-accent); background: transparent; font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.vm-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.vm-inline-empty { margin: 0; padding: 14px; border-radius: var(--radius-control); color: var(--text-muted); background: var(--background-subtle); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-trend-empty { display: flex; align-items: center; gap: 13px; padding: 16px; border: 1px dashed var(--border-control); border-radius: 10px; background: var(--background-subtle); }
.vm-trend-empty__icon { display: grid; width: 36px; height: 36px; flex: 0 0 auto; place-items: center; border-radius: 9px; color: var(--action-accent); background: var(--background-primary); font-size: 22px; }
.vm-trend-empty strong { color: var(--text-primary); font-size: 14px; }
.vm-trend-empty p { margin: 4px 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-answers-section .vm-drawer-section__heading { align-items: baseline; }
.vm-answers-section .vm-drawer-section__heading h3 { font-size: 16px; }
.vm-answers-section .vm-drawer-section__heading p { margin: 0; }
.vm-batches { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.vm-batches__label { flex: none; color: var(--text-secondary); font-weight: 600; }
.vm-batch-tabs { display: flex; flex: 1; min-width: 0; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-subtle); scrollbar-width: thin; }
.vm-batch-tabs button { display: grid; flex: 1 0 max(132px, 33.333%); justify-items: center; gap: 4px; padding: 12px 10px; border: 0; color: var(--text-secondary); background: transparent; font: inherit; white-space: nowrap; cursor: pointer; }
.vm-batch-tabs button + button { border-left: 1px solid var(--border-default); }
.vm-batch-tabs button span { color: var(--text-muted); font-size: var(--font-size-caption); }
.vm-batch-tabs button[aria-pressed='true'] { color: var(--action-accent); background: var(--background-primary); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--action-accent) 48%, transparent); }
.vm-batch-tabs button[aria-pressed='true'] span { color: inherit; }
.vm-batch-tabs button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -3px; }
.vm-batch-controls { display: flex; flex: none; align-items: center; gap: 4px; }
.vm-batch-controls :is(button, select), .vm-snapshot-button { min-height: 32px; border: 1px solid var(--border-control); border-radius: 8px; color: var(--text-secondary); background: var(--background-primary); font: inherit; cursor: pointer; }
.vm-batch-controls button { display: grid; width: 30px; padding: 0; place-items: center; }
.vm-batch-controls button:disabled { color: var(--text-muted); opacity: .55; cursor: default; }
.vm-batch-controls select { padding: 0 4px; font-size: 12px; font-variant-numeric: tabular-nums; }

.vm-answer-list { display: grid; gap: 11px; }
.vm-answer { min-width: 0; overflow: hidden; border: 1px solid var(--border-default); border-radius: 13px; background: var(--background-primary); }
.vm-answer[open] { border-color: color-mix(in srgb, var(--action-accent) 50%, var(--border-default)); }
.vm-answer summary { display: grid; grid-template-columns: 34px minmax(82px, 1fr) minmax(74px, .8fr) minmax(0, 3.2fr) 18px; align-items: center; gap: 12px; min-height: 64px; padding: 12px 18px; list-style: none; cursor: pointer; }
.vm-answer summary::-webkit-details-marker { display: none; }
.vm-answer summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -3px; border-radius: 12px; }
.vm-platform-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 10%, white); font-weight: 700; }
.vm-platform-mark.is-chatgpt { color: var(--status-success-foreground); background: var(--status-success-background); }
.vm-platform-mark.is-google-ai { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.vm-answer summary > strong { color: var(--text-primary); }
.vm-answer-status { padding: 4px 9px; border-radius: 999px; text-align: center; font-size: 12px; font-weight: 600; white-space: nowrap; }
.vm-answer-status.is-mentioned, .vm-answer-tags .vm-answer-tag--positive { color: var(--status-success-foreground); background: var(--status-success-background); }
.vm-answer-status.is-not-mentioned { color: var(--text-muted); background: var(--background-subtle); }
.vm-answer-preview { overflow: hidden; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.vm-answer-chevron { color: var(--text-muted); transition: transform 120ms ease; }
.vm-answer[open] .vm-answer-chevron { transform: rotate(180deg); }
.vm-answer__body { display: grid; gap: 9px; padding: 14px 18px 18px; border-top: 1px solid var(--border-default); }
.vm-answer-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.vm-answer-tags, .vm-answer__citations { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.vm-answer-tags span { padding: 5px 9px; border-radius: 999px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 9%, white); font-size: 12px; font-weight: 600; }
.vm-snapshot-button { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
.vm-answer__label, .vm-answer__citations > span { margin: 0; color: var(--text-muted); font-size: 12px; }
.vm-answer__body blockquote { max-height: 222px; overflow: auto; margin: 0; padding: 14px 16px; border: 1px solid var(--border-default); border-radius: 9px; color: var(--text-primary); background: var(--background-subtle); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; line-height: 1.75; overflow-wrap: anywhere; white-space: pre-wrap; }
.vm-answer__citations { padding-top: 2px; font-size: 12px; }
@media (max-width: 600px) {
  .vm-drawer-section { padding: 14px; }
  .vm-detail-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vm-batches { flex-wrap: wrap; justify-content: space-between; }
  .vm-batch-tabs { flex-basis: 100%; order: 1; }
  .vm-answer summary { grid-template-columns: 34px minmax(0, 1fr) auto 18px; gap: 8px; padding-inline: 12px; }
  .vm-answer-preview { grid-column: 2 / -1; grid-row: 2; }
  .vm-answer-chevron { grid-column: 4; grid-row: 1; }
  .vm-answer__body { padding-inline: 12px; }
}
</style>
