<script setup lang="ts">
import type { MarketTrend, QuestionHit } from '../../../api/monitoring'
import type { CitedPage, MonitoringQuestion, SourceDomain, TrendMode, TrendSeries, VisibilityTab } from '../../../data/visibility-monitoring-data'
import { computed, shallowRef, watch } from 'vue'
import { referenceMonitoringResults as data } from '../../../data/reference-monitoring-results'
import QuestionDetailDrawer from '../questions/QuestionDetailDrawer.vue'
import QuestionHitDetails from '../questions/QuestionHitDetails.vue'
import SourceDetailDrawer from '../sources/SourceDetailDrawer.vue'
import SourceDomainTracking from '../sources/SourceDomainTracking.vue'
import BrandMentionAnalysis from './BrandMentionAnalysis.vue'

const props = defineProps<{ activeTab: VisibilityTab, questionHits?: readonly QuestionHit[], hideQuestionComparison?: boolean, marketTrend?: MarketTrend | null }>()
const chartRounds = computed(() => [...(props.marketTrend?.rounds ?? [])].reverse().filter(round => round.monitorDate > '2026-09-18'))
const chartWeeks = computed(() => [...data.weeks, ...chartRounds.value.map(round => round.monitorDate.slice(5).replace('-', '/'))].slice(-12))
const chartBaselines = computed(() => (chartRounds.value.some(round => round.questionBaseline || round.brandBaseline || round.citationBaseline)
  ? chartRounds.value.filter(round => round.questionBaseline || round.brandBaseline || round.citationBaseline)
  : chartRounds.value.slice(-1)).filter(round => chartWeeks.value.includes(round.monitorDate.slice(5).replace('-', '/'))).map(round => ({
  date: round.monitorDate.slice(5).replace('-', '/'),
  roundNo: round.roundNo,
  question: !!round.questionBaseline,
  brand: !!round.brandBaseline,
  citation: !!round.citationBaseline,
})))
function extendSeries(series: readonly TrendSeries[], mode: 'overall' | 'competitor' | 'other'): TrendSeries[] {
  const count = chartRounds.value.length
  const own = props.marketTrend?.series.find(item => item.brandType === 1)
  return series.map((item) => {
    const brand = mode === 'overall' ? own : mode === 'competitor' ? props.marketTrend?.series.find(candidate => candidate.brandName === item.label) : null
    const extra = chartRounds.value.map((round) => {
      const index = props.marketTrend?.rounds.findIndex(candidate => candidate.roundId === round.roundId) ?? -1
      return brand?.points[index]?.mentionRate ?? null
    })
    return { ...item, values: [...item.values, ...(mode === 'other' ? Array<number | null>(count).fill(null) : extra)].slice(-12) }
  })
}
const overallSeries = computed(() => extendSeries(data.overallSeries, 'overall'))
const competitorSeries = computed(() => extendSeries(data.trendSeries, 'competitor'))
const engineSeries = computed(() => extendSeries(data.engineSeries, 'other'))
const personaSeries = computed(() => extendSeries(data.personaSeries, 'other'))
const questions = computed<readonly MonitoringQuestion[]>(() => props.questionHits?.map((hit) => {
  const reference = data.relatedQuestions.find(question => question.question === hit.questionContent)
  return {
    id: `Q${hit.questionId}`,
    question: hit.questionContent,
    keyword: hit.themeName ?? '',
    type: reference?.type ?? '业务词',
    persona: hit.personaName,
    stage: reference?.stage ?? '',
    intent: reference?.intent ?? '',
    concern: reference?.concern ?? '',
    platformResults: reference?.platformResults ?? [],
    competitors: hit.competitorNames?.split(',').map(name => name.trim()).filter(Boolean) ?? [],
    officialSiteCited: hit.isOfficialCited === 1,
    rank: hit.brandRank,
    rankTotal: hit.rankTotal,
    trend: (hit.trend ?? 0) > 0 ? 'up' : (hit.trend ?? 0) < 0 ? 'down' : 'flat',
    mentionVsPrevPp: hit.mentionVsPrevPp,
    samplingBatches: reference?.samplingBatches ?? [],
  }
}) ?? data.questions)
const trendMode = shallowRef<TrendMode>('overall')
const selectedQuestion = shallowRef<MonitoringQuestion | null>(null)
const selectedSource = shallowRef<SourceDomain | CitedPage | null>(null)
function openQuestion(id: string) {
  selectedSource.value = null
  selectedQuestion.value = questions.value.find(question => question.id === id) ?? data.relatedQuestions.find(question => question.id === id) ?? null
}
function openSource(id: string) {
  selectedQuestion.value = null
  selectedSource.value = data.sources.find(source => source.id === id) ?? data.citedPages.find(page => page.id === id) ?? null
}
watch(() => props.activeTab, () => {
  selectedQuestion.value = null
  selectedSource.value = null
})
</script>

<template>
  <section :id="`visibility-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`visibility-tab-${activeTab}`" class="reference-monitoring-results">
    <BrandMentionAnalysis
      v-if="activeTab === 'brand'"
      v-model="trendMode"
      :weeks="chartWeeks" :overall-series="overallSeries" :series="competitorSeries" :baselines="chartBaselines"
      :engine-series="engineSeries" :persona-series="personaSeries"
      :competitors="data.competitors" :personas="data.personas" :topics="data.topics" :intents="data.intents"
      :topic-cells="data.topicCells" :intent-cells="data.intentCells"
    />
    <QuestionHitDetails v-else-if="activeTab === 'questions'" :questions="questions" :platforms="data.platforms" :hide-comparison="hideQuestionComparison" @select-question="openQuestion" />
    <SourceDomainTracking v-else :sources="data.sources" :pages="data.citedPages" :platforms="data.platforms" @select-source="openSource" />
    <QuestionDetailDrawer
      :question="selectedQuestion" :open="!!selectedQuestion" :platforms="data.platforms"
      :pages="data.citedPages" :sources="data.sources" :brand="data.overview.brand"
      @close="selectedQuestion = null" @select-source="openSource"
    />
    <SourceDetailDrawer
      :source="selectedSource" :open="!!selectedSource" :sources="data.sources" :pages="data.citedPages"
      :questions="data.relatedQuestions" :platforms="data.platforms"
      @close="selectedSource = null" @select-page="openSource" @select-question="openQuestion"
    />
  </section>
</template>
