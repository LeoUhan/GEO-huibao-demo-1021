import type { BrandMetric, PageResult, PersonaMetric, PlatformMetric, QuestionHit, RoundDetail, RoundSummary, SourceDomainMetric, SourcePageMetric } from '../api/monitoring'
import { computed, ref, shallowRef } from 'vue'
import { getBrandMetrics, getPersonaMetrics, getPlatformMetrics, getQuestionHits, getRoundDetail, getRounds, getSourceDomains, getSourcePages } from '../api/monitoring'

export function useMonitoringRound() {
  const round = shallowRef<RoundSummary | null>(null)
  const detail = shallowRef<RoundDetail | null>(null)
  const brandMetrics = shallowRef<BrandMetric[]>([])
  const platformMetrics = shallowRef<PlatformMetric[]>([])
  const personaMetrics = shallowRef<PersonaMetric[]>([])
  const questionHits = shallowRef<QuestionHit[]>([])
  const sourceDomains = shallowRef<PageResult<SourceDomainMetric> | null>(null)
  const sourcePages = shallowRef<PageResult<SourcePageMetric> | null>(null)
  const loading = ref(false)
  const error = ref('')
  const empty = computed(() => !loading.value && !error.value && round.value === null)

  function clearSnapshot() {
    round.value = null
    detail.value = null
    brandMetrics.value = []
    platformMetrics.value = []
    personaMetrics.value = []
    questionHits.value = []
    sourceDomains.value = null
    sourcePages.value = null
  }

  async function load() {
    if (loading.value)
      return
    loading.value = true
    error.value = ''
    clearSnapshot()
    try {
      const rounds = await getRounds({ pageNum: 1, pageSize: 1 })
      const latestRound = rounds.records[0]
      if (!latestRound) {
        loading.value = false
        return
      }

      round.value = latestRound
      const [roundDetail, brands, platforms, personas, questions, domains, pages] = await Promise.all([
        getRoundDetail(latestRound.id),
        getBrandMetrics(latestRound.id),
        getPlatformMetrics(latestRound.id),
        getPersonaMetrics(latestRound.id),
        getQuestionHits(latestRound.id),
        getSourceDomains(latestRound.id, 1, 50),
        getSourcePages(latestRound.id, 1, 50),
      ])
      detail.value = roundDetail
      brandMetrics.value = brands
      platformMetrics.value = platforms
      personaMetrics.value = personas
      questionHits.value = questions
      sourceDomains.value = domains
      sourcePages.value = pages
    }
    catch (cause) {
      clearSnapshot()
      error.value = cause instanceof Error ? cause.message : '监测轮次数据加载失败'
    }
    finally {
      loading.value = false
    }
  }

  return { round, detail, brandMetrics, platformMetrics, personaMetrics, questionHits, sourceDomains, sourcePages, loading, error, empty, load }
}
