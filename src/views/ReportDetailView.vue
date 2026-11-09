<script setup lang="ts">
import type { ReportType } from '../data/report-center-data'
import { computed, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import ReportDetailDocument from '../components/report-center/ReportDetailDocument.vue'
import { getReportDetailData } from '../data/report-detail-data'
import { findMockReportById } from '../mock/report-service'

const prototypeLoaders = {
  weekly: () => import('../data/report-prototypes/weekly.html?raw'),
  monthly: () => import('../data/report-prototypes/monthly.html?raw'),
  quarterly: () => import('../data/report-prototypes/quarterly.html?raw'),
  adhoc: () => import('../data/report-prototypes/adhoc.html?raw'),
} satisfies Record<ReportType, () => Promise<{ default: string }>>

const route = useRoute()
const report = shallowRef<ReturnType<typeof getReportDetailData>>(null)
const prototypeType = shallowRef<ReportType | null>(null)
const prototypeHtml = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
const backHref = computed(() => {
  const query = new URLSearchParams({ view: 'report-center' })
  if (typeof route.query.siteId === 'string')
    query.set('siteId', route.query.siteId)
  if (typeof route.query.marketId === 'string')
    query.set('marketId', route.query.marketId)
  return `${import.meta.env.BASE_URL}?${query}`
})
// A bare fragment in srcdoc resolves against the parent page's URL.
const prototypeDocument = computed(() => prototypeHtml.value
  .replace('href="../report-center"', () => `href="${backHref.value.replaceAll('&', '&amp;')}"`)
  .replaceAll('href="#', 'href="about:srcdoc#'))

watch(() => String(route.params.reportId ?? ''), async (reportId, _, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  error.value = ''
  report.value = null
  prototypeType.value = null
  prototypeHtml.value = ''
  loading.value = false

  const record = findMockReportById(reportId)
  if (!record) {
    report.value = getReportDetailData(reportId)
    return
  }

  loading.value = true
  try {
    const { default: html } = await prototypeLoaders[record.type]()
    if (current) {
      prototypeHtml.value = html
      prototypeType.value = record.type
    }
  }
  catch {
    if (current)
      error.value = '请刷新页面后再试。'
  }
  finally {
    if (current)
      loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <main v-if="prototypeType" class="report-prototype-view">
    <iframe
      class="report-prototype-view__frame"
      :srcdoc="prototypeDocument"
      :title="`${({ weekly: '周报', monthly: '月报', quarterly: '季报', adhoc: '次报' })[prototypeType]}内容`"
      sandbox="allow-scripts allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      referrerpolicy="no-referrer"
    />
  </main>
  <ReportDetailDocument v-else-if="report" :profile="report" :back-href="backHref" />
  <main v-else-if="loading" class="report-loading" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true" />
    <span>正在加载报告…</span>
  </main>
  <main v-else-if="error" class="report-not-found" role="alert">
    <section><span>GEO Agent · 报告中心</span><h1>报告加载失败</h1><p>{{ error }}</p><a :href="backHref">返回报告中心</a></section>
  </main>
  <main v-else class="report-not-found">
    <section>
      <span>GEO Agent · 报告中心</span>
      <h1>找不到这份报告</h1>
      <p>链接可能已失效，或报告尚未生成。</p>
      <a :href="backHref">返回报告中心</a>
    </section>
  </main>
</template>

<style scoped>
.report-prototype-view { width: 100%; min-height: 100vh; background: #f4f6fa; }
.report-prototype-view__frame { display: block; width: 100%; height: 100vh; min-height: 700px; border: 0; background: #f4f6fa; }
.report-not-found { display: grid; min-height: 100vh; place-items: center; padding: 24px; background: #f4f6fa; color: #172033; }
.report-not-found section { width: min(100%, 520px); padding: 32px; border: 1px solid #dde5ee; border-radius: 12px; background: #fff; }
.report-not-found span { color: #2563eb; font-size: 12px; font-weight: 700; }
.report-not-found h1 { margin: 10px 0 6px; font-size: 24px; }
.report-not-found p { margin: 0 0 20px; color: #5f6e82; font-size: 14px; }
.report-not-found a { color: #1d4ed8; font-size: 14px; font-weight: 650; }
.report-loading { display: flex; min-height: 100vh; align-items: center; justify-content: center; gap: 10px; color: #64748b; font-size: 14px; }
.loading-spinner { width: 16px; height: 16px; border: 2px solid #dbe4ef; border-top-color: #2563eb; border-radius: 50%; animation: report-spin 700ms linear infinite; }
@keyframes report-spin { to { transform: rotate(360deg); } }
</style>
