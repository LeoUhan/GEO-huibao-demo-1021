import type { MockRound, MockState } from './state'
import type { BrandMetric, MarketTrend, MonitoringSchedule, PageResult, PersonaMetric, PlatformMetric, QuestionHit, RoundDetail, RoundResponseDetail, RoundResponseQuery, RoundResponseRecord, RoundSummary, SaveMonitoringScheduleRequest, SourceDomainMetric, SourcePageMetric } from '../api/monitoring'
import { visibilityMonitoringData } from '../data/visibility-monitoring-data'
import { packageMonitoringPlatforms } from './config-service'
import { brandBaselineChanges, questionSetChanged } from './monitoring-baseline'
import { monitoringConfiguration, readMockState, updateMockState } from './repository'

const clone = <T>(value: T): T => structuredClone(value)
const page = <T>(records: T[], pageNum = 1, pageSize = records.length): PageResult<T> => ({ records: records.slice((pageNum - 1) * pageSize, pageNum * pageSize), total: records.length, size: pageSize, current: pageNum, pages: Math.ceil(records.length / pageSize) })
const roundId = (date: string) => Number(date.replaceAll('-', ''))
const idForRound = (round: MockRound) => round.apiId ?? roundId(round.date)

function marketRounds(state: MockState) {
  return state.monitoring.rounds.filter(round => (round.marketId ?? state.config.activeMarketId) === state.config.activeMarketId)
}

function summaries(state = readMockState()): RoundSummary[] {
  const rounds = marketRounds(state)
  return rounds.map((round, index) => ({
    id: idForRound(round),
    roundNo: rounds.length - index,
    triggerType: 1,
    roundStatus: round.status === 'completed' ? 2 : 1,
    monitorDate: round.date,
    totalSample: round.responseCount,
    startedAt: `${round.date}T05:00:00`,
    questionBaseline: round.questionBaseline,
    brandBaseline: round.brandBaseline,
    citationBaseline: round.citationBaseline,
  }))
}

function configurationFor(id: number, state = readMockState()) {
  return marketRounds(state).find(round => idForRound(round) === id)?.configuration ?? state.config
}

function detailFor(id: number): RoundDetail {
  const state = readMockState()
  const row = summaries(state).find(item => item.id === id)
  if (!row)
    throw new Error('未找到监测轮次')
  return { ...row, customerId: 1, siteId: 1001, marketId: state.config.activeMarketId, confidenceLevel: '95%', finishedSampleCount: row.totalSample, validSample: Math.floor(row.totalSample * 0.974), judgedCount: row.totalSample, pendingJudgeCount: 0, validReturnRate: 97.4, dualSourceRate: 91, manualReviewRate: 96, manualReviewCount: 62, repeatablePp: 3.1, ciValue: 2.8, finishedAt: `${row.monitorDate}T05:30:00` }
}

function responseRows(round: RoundSummary): RoundResponseRecord[] {
  const config = configurationFor(round.id)
  const platforms = config.platforms.filter(item => item.enabled)
  return config.questions.map((question, index) => ({ id: round.id * 1000 + index + 1, roundId: round.id, questionId: question.id, personaId: question.personaId, platform: platforms[index % platforms.length]?.platform ?? 'ChatGPT', collectStatus: 1, failReason: null, isMentioned: index % 3 === 0 ? 1 : 0, repeatNo: 1, collectChannel: 1, collectTime: `${round.monitorDate}T05:10:00` }))
}
export async function getMarketTrend(limit?: number): Promise<MarketTrend> {
  const rounds = summaries().slice(0, limit ?? 5)
  const series = visibilityMonitoringData.competitors.map((brand, index) => ({ brandType: brand.ownBrand ? 1 : 2, brandId: index + 1, brandName: brand.name, points: rounds.map((_round, roundIndex) => ({ mentionRate: Math.max(0, brand.mentionRate - roundIndex * 2), recommendRate: Math.max(0, brand.recommendationRate - roundIndex), citationRate: ('officialCitationRate' in brand ? brand.officialCitationRate : 0), sovRate: brand.mentionRate })) }))
  return { rounds: rounds.map(item => ({ roundId: item.id, roundNo: item.roundNo, monitorDate: item.monitorDate, isComparablePrev: item.questionBaseline ? 0 : 1 })), series }
}
export async function getRounds(params: { pageNum?: number, pageSize?: number, triggerType?: number } = {}): Promise<PageResult<RoundSummary>> { return page(summaries(), params.pageNum ?? 1, params.pageSize ?? 10) }
export async function getRoundDetail(id: number): Promise<RoundDetail> { return clone(detailFor(id)) }
export async function getRoundResponses(id: number, params: RoundResponseQuery = {}): Promise<PageResult<RoundResponseRecord>> {
  const round = summaries().find(item => item.id === id)
  let rows = round ? responseRows(round) : []
  if (params.questionId)
    rows = rows.filter(row => row.questionId === params.questionId)
  if (params.platform)
    rows = rows.filter(row => row.platform === params.platform)
  if (params.collectStatus !== undefined)
    rows = rows.filter(row => row.collectStatus === params.collectStatus)
  return page(rows, params.pageNum ?? 1, params.pageSize ?? 20)
}
export async function getResponseDetail(id: number): Promise<RoundResponseDetail> {
  const round = summaries().find(item => item.id === Math.floor(id / 1000))
  const response = round && responseRows(round).find(item => item.id === id)
  if (!response)
    throw new Error('未找到该轮次的回答')
  const question = configurationFor(response.roundId).questions.find(item => item.id === response.questionId)
  return { ...response, modelVersion: 'demo-v1', promptContent: question?.questionContent ?? '', responseContent: `针对该问题，用户通常比较切割精度、设备稳定性、售后服务和总拥有成本。APW Waterjet 提供适用于复合材料加工的水刀解决方案。`, citationLinks: [{ url: 'https://www.apwwaterjet.com/solutions/composites', title: 'APW Waterjet 复合材料解决方案' }], htmlSnapshotUrl: null, retryCount: 0, isInRecommendDenominator: 1, isCitable: 1, mentionCount: response.isMentioned ?? 0, recommendTendency: 1, hasRank: 1, brandRank: 2, rankTotal: 4, isOfficialCited: 1, factStatus: 1, sentiment: 1, isCompetitorHit: 1, competitorHits: [] }
}
export async function getBrandMetrics(id: number): Promise<BrandMetric[]> {
  const config = configurationFor(id)
  return visibilityMonitoringData.competitors.map((brand, index) => ({ brandType: brand.ownBrand ? 1 : 2, brandId: index + 1, brandName: brand.ownBrand ? config.brand.brandName : brand.name, validAnswerCount: 1169, mentionedAnswerCount: Math.round(1169 * brand.mentionRate / 100), mentionTotalCount: 1169, mentionRate: brand.mentionRate, recommendRate: brand.recommendationRate, citationRate: ('officialCitationRate' in brand ? brand.officialCitationRate : 0), sovRate: brand.mentionRate, avgRank: brand.rank, top1Rate: brand.rank === 1 ? 100 : 0, top3Rate: brand.rank <= 3 ? 100 : 0, top5Rate: 100, factAccuracyRate: 96, sentimentPositiveCount: 35, sentimentNeutralCount: 20, sentimentNegativeCount: 2 }))
}
export async function getPlatformMetrics(id: number): Promise<PlatformMetric[]> {
  const round = summaries().find(item => item.id === id)
  return configurationFor(id).platforms.filter(item => item.enabled).map(item => ({ platform: item.platform, modelVersion: item.modelVersion, sampleCount: 200, validAnswerCount: 195, mentionedAnswerCount: 82, mentionRate: 42, mentionVsPrevPp: round?.questionBaseline || round?.brandBaseline ? null : 2.4, citedAnswerCount: 36, citationRate: 18 })) }
export async function getPersonaMetrics(id: number, dimType = 1): Promise<PersonaMetric[]> { return configurationFor(id).personas.map(persona => ({ personaId: persona.id, personaName: persona.personaName, dimType, dimValue: persona.purchaseStages[0] ?? null, dimName: '采购阶段', validAnswerCount: 190, mentionedAnswerCount: 78, mentionRate: 41, metricLevel: 1 })) }
export async function getQuestionHits(id: number): Promise<QuestionHit[]> {
  const config = configurationFor(id)
  const round = summaries().find(item => item.id === id)
  return config.questions.map((question, index) => ({ questionId: question.id, questionContent: question.questionContent, personaId: question.personaId, personaName: config.personas.find(persona => persona.id === question.personaId)?.personaName ?? '买家人设', themeId: null, themeName: question.keyword, platformHits: config.platforms.filter(platform => platform.enabled).map(platform => platform.platform).join(', '), isCompetitorMentioned: 1, competitorNames: 'Flow X, OMAX', isOfficialCited: index % 2, brandRank: 2, rankTotal: 4, trend: round?.questionBaseline || round?.brandBaseline ? null : index % 3 - 1, detailJson: null })) }
export async function getSourceDomains(_id: number, pageNum = 1, pageSize = 10): Promise<PageResult<SourceDomainMetric>> { return page(visibilityMonitoringData.sources.map(item => ({ domain: item.domain, hitQuestionCount: item.questionCount, citationCount: item.citationCount, platforms: item.platforms.join(', '), isOurMentioned: item.ownBrandMentioned ? 1 : 0, isCompetitorCited: item.competitors.length ? 1 : 0, competitorNames: item.competitors.join(', ') })), pageNum, pageSize) }
export async function getSourcePages(_id: number, pageNum = 1, pageSize = 10): Promise<PageResult<SourcePageMetric>> { return page(visibilityMonitoringData.citedPages.map(item => ({ domain: visibilityMonitoringData.sources.find(domain => domain.id === item.domainId)?.domain ?? '', pageUrl: `https://${visibilityMonitoringData.sources.find(domain => domain.id === item.domainId)?.domain ?? 'example.com'}/${item.id}`, pageTitle: item.title, excerptText: item.summary, ownerBrandType: item.ownBrandMentioned ? 1 : 2, ownerBrandId: 1, citationCount: item.citations, hitQuestionCount: item.questionIds.length, platforms: item.platforms.join(', '), responseIds: item.questionIds.join(',') })), pageNum, pageSize) }
export async function getSchedule(): Promise<MonitoringSchedule | null> {
  const { settings, isPaused } = readMockState().monitoring
  return { id: 1, siteId: 1001, marketId: readMockState().config.activeMarketId, scheduleType: settings.frequency, executeTime: `${settings.weekday} ${settings.time}`, repeatCount: 1, timezone: 'Europe/Berlin', enabled: isPaused ? 0 : 1, nextFireTime: null, lastFireTime: null, lastExecuteStatus: 1, lastRoundId: summaries()[0]?.id ?? null }
}
export async function saveSchedule(request: SaveMonitoringScheduleRequest): Promise<number> {
  updateMockState((draft) => {
    draft.monitoring.settings.frequency = request.scheduleType
    const [weekday, time] = request.executeTime.split(' ')
    draft.monitoring.settings.weekday = weekday || '周一'
    draft.monitoring.settings.time = time || '05:00'
  })
  return 1
}
export async function triggerRound(): Promise<number> {
  const date = new Date().toISOString().slice(0, 10)
  let id = roundId(date)
  updateMockState((draft) => {
    if (draft.monitoring.rounds.some(round => idForRound(round) === id)) {
      id = Date.now()
      while (draft.monitoring.rounds.some(round => idForRound(round) === id))
        id++
    }
    const plannedConfiguration = () => monitoringConfiguration({ ...draft.config, platforms: packageMonitoringPlatforms(draft.config.platforms) })
    const configuration = draft.monitoring.isPaused
      ? draft.monitoring.pausedConfigurations?.[draft.config.activeMarketId] ?? plannedConfiguration()
      : plannedConfiguration()
    const previous = marketRounds(draft)[0]?.configuration
    const baseline = previous ? {
      questionBaseline: questionSetChanged(previous.questions, configuration.questions, question => question.questionContent),
      ...brandBaselineChanges(previous.brand, configuration.brand),
    } : { questionBaseline: false }
    draft.monitoring.rounds.unshift({
      id: `round-${id}`,
      apiId: id,
      date,
      status: 'completed',
      marketId: draft.config.activeMarketId,
      configuration,
      responseCount: configuration.questions.length * configuration.platforms.filter(item => item.enabled).length,
      ...baseline,
    })
  })
  return id
}
export async function pauseMonitoring(): Promise<void> { updateMockState((draft) => { draft.monitoring.isPaused = true }) }
export async function resumeMonitoring(): Promise<void> {
  updateMockState((draft) => {
    draft.monitoring.isPaused = false
    if (draft.monitoring.pausedConfigurations)
      delete draft.monitoring.pausedConfigurations[draft.config.activeMarketId]
  })
}
export async function resumeAllMonitoring(): Promise<void> { await resumeMonitoring() }
