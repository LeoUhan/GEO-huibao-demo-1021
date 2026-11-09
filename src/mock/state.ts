import type { GeoTask } from '../data/geo-data'
import type { ReportRecord } from '../data/report-center-data'
import type { MonitoringQuestion } from '../data/visibility-monitoring-data'

export interface MockCompetitor {
  id: number
  competitorName: string
  domain: string
  aliasNames: string
  competitorDesc: string
  isCoreSov: number
  sourceType: number
  status: number
}

export interface MockRecommendation extends MockCompetitor {
  recommendationId: number
  occurrenceCount: number
  questionIds: string[]
  platformNames: string[]
  recommendationStatus: 'pending' | 'accepted' | 'ignored'
}

export interface MockPersona {
  id: number
  personaName: string
  personaType: string
  actualPosition: string
  industry: string
  companyScale: string
  decisionRole: string
  purchaseTrigger: string
  purchaseBudget: string
  purchaseCycle: string
  infoChannels: string
  description: string
  focusTopics: string[]
  purchaseStages: string[]
  sourceType: number
  status: number
}

export interface MockQuestion {
  id: number
  questionContent: string
  keyword: string
  themeId: number | null
  questionType: string
  personaId: number
  purchaseStage: string
  intentType: string
  focusType: string
  isFirstSelected: number
  sourceType: number
  status: number
}

export interface MockBrandProduct {
  id: number
  lineName: string
  productName: string
  usageScene: string
  sellingPoints: string[]
  targetCustomers: string[]
  sourceType: number
  isPrimary: number
}

export interface MockState {
  schemaVersion: 1
  revision: number
  identity: { siteId: string, userId: number, userName: string }
  config: {
    activeMarketId: number
    wizard: { entryStatus: 'CONFIGURED' | 'CONTINUE_WIZARD' | 'FIRST_TIME', id: number, currentStep: number, maxReachedStep: number }
    markets: Array<{ id: number, marketType: number, status: number, marketCountry: string, marketLanguage: string, subSiteName: string }>
    brand: { brandName: string, industry: string, siteUrl: string, aliasNames: string, positioning: string, saved: number }
    products: MockBrandProduct[]
    personas: MockPersona[]
    personasByMarket?: Record<number, MockPersona[]>
    questions: MockQuestion[]
    questionsByMarket?: Record<number, MockQuestion[]>
    brandReview?: { remaining: number, generating?: boolean, markets: Record<number, MockMarketReview> }
    platforms: Array<{ id: number, platform: string, modelVersion: string | null, enabled: number, sort: number }>
    competitors: MockCompetitor[]
    themes: Array<{ id: number, themeName: string, searchVolume: number, cpcCost: number, competition: number, resultCount: number, keywordIntent: string, status: number }>
    recommendations: MockRecommendation[]
    dictionaries: Record<string, Array<{ dictValue: string, dictLabel: string, extra: string | null, sort: number }>>
    nextId: number
  }
  monitoring: {
    questions: MonitoringQuestion[]
    settings: { frequency: 'daily' | 'weekly' | 'monthly', weekday: string, time: string, platforms: string[] }
    isPaused: boolean
    pausedByMarket?: Record<number, boolean>
    pausedConfigurations?: Record<number, MockRoundConfiguration>
    rounds: MockRound[]
  }
  tasks: GeoTask[]
  diagnosis: { findings: unknown[], strategies: unknown[] }
  reports: { quota: number, items: ReportRecord[] }
}

export interface MockMarketReview {
  processed: boolean
  processedAddedCount?: number
  processedRemovedCount?: number
  candidates: MonitoringQuestion[]
}

export type MockRoundConfiguration = Pick<MockState['config'], 'brand' | 'products' | 'competitors' | 'personas' | 'questions' | 'platforms'>

export interface MockRound {
  id: string
  apiId?: number
  date: string
  status: 'completed' | 'running'
  responseCount: number
  marketId?: number
  configuration?: MockRoundConfiguration
  questionBaseline?: boolean
  brandBaseline?: boolean
  citationBaseline?: boolean
}
