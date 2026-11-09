import type { MonitoringQuestion } from '../../../../data/visibility-monitoring-data'
import type { MockQuestion, MockState } from '../../../../mock/state'
import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeChangeImpact, BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'
import { brandBaselineChanges } from '../../../../mock/monitoring-baseline'
import { isMarketPaused, marketPersonas, marketQuestions, readMockState, updateMockState } from '../../../../mock/repository'

const clone = <T>(value: T): T => structuredClone(value)

const germanQuestions = [
  'Welche 5-Achs-Wasserstrahlschneidsysteme eignen sich für CFRP-Luftfahrtbauteile und welche Anbieter bieten präzise, delaminationsfreie Schnitte?',
  'Welche Hersteller bieten Wasserstrahlschneidanlagen für die präzise Bearbeitung von Verbundwerkstoffen in der Luftfahrt?',
  'Wie wählen Einkäufer ein 5-Achs-Wasserstrahlsystem für anspruchsvolle Verbundwerkstoffe aus?',
  'Welche Vorteile bietet Wasserstrahlschneiden gegenüber Laserschneiden bei CFK-Bauteilen?',
  'Welche technischen Merkmale sind bei der Beschaffung einer industriellen Wasserstrahlanlage wichtig?',
  'Wie lässt sich die Schnittqualität bei komplexen Luftfahrtbauteilen zuverlässig bewerten?',
  'Welche Anbieter unterstützen die präzise Bearbeitung von Titan und Verbundwerkstoffen?',
]

const englishQuestions = [
  'Which 5-axis waterjet systems are suitable for CFRP aerospace parts and deliver precise, delamination-free cuts?',
  'Which manufacturers offer waterjet cutting systems for precision aerospace composites?',
  'How should buyers evaluate a 5-axis waterjet system for advanced composite materials?',
  'What are the advantages of waterjet cutting over laser cutting for carbon-fiber parts?',
  'Which technical features matter when purchasing an industrial waterjet system?',
  'How can manufacturers assess cut quality for complex aerospace components?',
  'Which suppliers support precision machining of titanium and composite materials?',
]

const frenchQuestions = [
  'Quels systèmes de découpe au jet d’eau 5 axes conviennent aux pièces aéronautiques en CFRP sans délaminage ?',
  'Quels fabricants proposent des systèmes de découpe au jet d’eau de précision pour les composites aéronautiques ?',
  'Comment évaluer un système de découpe au jet d’eau 5 axes pour les matériaux composites avancés ?',
  'Quels sont les avantages du jet d’eau par rapport au laser pour les pièces en fibre de carbone ?',
  'Quelles caractéristiques techniques comptent lors de l’achat d’un système industriel au jet d’eau ?',
  'Comment évaluer la qualité de coupe de pièces aéronautiques complexes ?',
  'Quels fournisseurs usinent avec précision le titane et les matériaux composites ?',
]

function buildQuestions(marketId: string, language: string): MonitoringQuestion[] {
  const texts = ['de', 'de-DE'].includes(language) || language === '德语' ? germanQuestions : ['fr', 'fr-FR'].includes(language) || language === '法语' ? frenchQuestions : englishQuestions
  return texts.map((question, index) => {
    const base = visibilityMonitoringData.questions[index % visibilityMonitoringData.questions.length]!
    return {
      ...clone(base),
      id: `${marketId}-ai-${String(index + 1).padStart(2, '0')}`,
      question,
    }
  })
}

const quota = { total: 3, remaining: 2 }

function brandFields(items: KnowledgeItem[], current: MockState['config']['brand']) {
  const brand = items.find(item => item.id === 'brand')?.brand
  return brand ? {
    ...current,
    brandName: brand.name,
    aliasNames: brand.alias,
    industry: brand.industry,
    positioning: brand.description,
    siteUrl: brand.website ?? current.siteUrl,
    saved: 1,
  } : current
}

function saveKnowledge(items: KnowledgeItem[], state: MockState) {
  const { config } = state
  config.brand = brandFields(items, config.brand)
  const products = items.find(item => item.id === 'product')?.products
  if (products) {
    config.products = products.map((product) => {
      const existing = config.products.find(row => String(row.id) === product.id)
      return {
        id: existing?.id ?? ++config.nextId,
        lineName: existing?.lineName ?? product.name,
        productName: product.name,
        usageScene: product.useCase,
        sellingPoints: product.strengths.split(' · ').filter(Boolean),
        targetCustomers: product.customerGroup.split(' · ').filter(Boolean),
        sourceType: existing?.sourceType ?? 1,
        isPrimary: product.isPrimary ? 1 : 0,
      }
    })
  }
  const competitors = items.find(item => item.id === 'competitor')?.competitors
  if (competitors) {
    config.competitors = competitors.map((competitor) => {
      const existing = config.competitors.find(row => String(row.id) === competitor.id)
      const recommendation = config.recommendations.find(row => String(-row.recommendationId) === competitor.id)
      if (recommendation)
        recommendation.recommendationStatus = 'accepted'
      return {
        id: existing?.id ?? ++config.nextId,
        competitorName: competitor.name,
        domain: competitor.domain,
        aliasNames: competitor.alias,
        competitorDesc: competitor.description,
        isCoreSov: existing?.isCoreSov ?? 0,
        sourceType: existing?.sourceType ?? (recommendation ? 3 : 1),
        status: competitor.confirmed ? 1 : 0,
      }
    })
  }
}

function displayQuestion(question: MockQuestion, personas: MockState['config']['personas']): MonitoringQuestion {
  return {
    id: `Q${question.id}`,
    question: question.questionContent,
    keyword: question.keyword,
    type: question.questionType as MonitoringQuestion['type'],
    persona: personas.find(persona => persona.id === question.personaId)?.personaName ?? '',
    stage: question.purchaseStage,
    intent: question.intentType,
    concern: question.focusType,
    platformResults: [],
    competitors: [],
    officialSiteCited: false,
    rank: null,
    trend: 'flat',
    samplingBatches: [],
  }
}

function snapshot(state: MockState, knowledgeItems: KnowledgeItem[] = []): BrandKnowledgeUpdateSnapshot {
  const review = state.config.brandReview
  const markets: MarketRecommendationState[] = state.config.markets.filter(market => market.status === 1).map((market) => {
    const stored = review?.markets[market.id]
    const existingQuestions = marketQuestions(state, market.id).map(question => displayQuestion(question, marketPersonas(state, market.id)))
    const existingText = new Set(existingQuestions.map(question => question.question.trim()))
    return {
      id: String(market.id),
      name: `${market.marketCountry} · ${market.marketLanguage}`,
      language: market.marketLanguage,
      enabled: !isMarketPaused(state, market.id),
      processed: stored?.processed ?? true,
      processedAddedCount: stored?.processedAddedCount,
      processedRemovedCount: stored?.processedRemovedCount,
      candidates: (stored?.candidates ?? []).filter(candidate => !existingText.has(candidate.question.trim())),
      selectedCandidateIds: [],
      existingQuestions,
    }
  })
  return { demo: true, editQuota: { ...quota, remaining: review?.remaining ?? quota.remaining }, knowledgeItems, markets }
}

export function createMockBrandKnowledgeUpdateService(): BrandKnowledgeUpdateService {
  async function finishGeneration(state: MockState) {
    if (!state.config.brandReview?.generating)
      return state
    await new Promise<void>(resolve => setTimeout(resolve, 350))
    return updateMockState((draft) => {
      const review = draft.config.brandReview
      if (!review?.generating || review.remaining !== state.config.brandReview?.remaining)
        return
      for (const market of draft.config.markets.filter(market => market.status === 1)) {
        review.markets[market.id] = {
          processed: false,
          candidates: buildQuestions(`${market.id}-batch-${review.remaining}`, market.marketLanguage),
        }
      }
      review.generating = false
    })
  }

  const getSnapshot = async () => snapshot(await finishGeneration(readMockState()))

  const previewChange = async (items: KnowledgeItem[]): Promise<BrandKnowledgeChangeImpact> => {
    const state = readMockState()
    const current = snapshot(state)
    return {
      affectedMarkets: current.markets.map(market => market.name),
      editCost: 1,
      remainingEdits: Math.max(0, current.editQuota.remaining - 1),
      quotaAvailable: current.editQuota.remaining > 0,
      ...brandBaselineChanges(state.config.brand, brandFields(items, state.config.brand)),
    }
  }

  const confirmChange = async (items: KnowledgeItem[]): Promise<BrandKnowledgeUpdateSnapshot> => {
    const state = updateMockState((draft) => {
      const remaining = draft.config.brandReview?.remaining ?? quota.remaining
      if (remaining < 1)
        throw new Error('品牌知识修改次数不足，暂时无法确认')
      saveKnowledge(items, draft)
      draft.config.brandReview = { remaining: remaining - 1, generating: true, markets: {} }
    })
    return snapshot(await finishGeneration(state), items)
  }

  const saveMarketSelection = async (marketId: string, candidateIds: string[], removedQuestionIds: string[] = []) => {
    const id = Number(marketId)
    const state = updateMockState((draft) => {
      const market = snapshot(draft).markets.find(item => item.id === marketId)
      const review = draft.config.brandReview?.markets[id]
      if (!market || !review)
        throw new Error('未找到该市场的推荐批次')
      const selected = [...new Set(candidateIds)]
      if (selected.length > 10)
        throw new Error('每个市场最多选择 10 条推荐问题')
      const candidates = new Map(market.candidates.map(candidate => [candidate.id, candidate]))
      if (selected.some(candidateId => !candidates.has(candidateId)))
        throw new Error('选择中包含无效或已过期的候选问题')

      const current = marketQuestions(draft, id)
      const removed = new Set(removedQuestionIds)
      const next = current.filter(question => !removed.has(`Q${question.id}`))
      const personas = marketPersonas(draft, id)
      if (id !== draft.config.activeMarketId) {
        const personasByMarket = draft.config.personasByMarket ??= {}
        personasByMarket[id] ??= structuredClone(personas)
      }
      for (const candidateId of selected) {
        const question = candidates.get(candidateId)!
        const persona = personas.find(persona => persona.personaName === question.persona) ?? personas[0]
        next.push({ id: ++draft.config.nextId, questionContent: question.question, keyword: question.keyword, questionType: question.type, personaId: persona?.id ?? 0, purchaseStage: question.stage, intentType: question.intent, focusType: question.concern, themeId: null, isFirstSelected: 1, sourceType: 1, status: 1 })
      }
      review.processed = true
      review.processedAddedCount = selected.length
      review.processedRemovedCount = current.length + selected.length - next.length
      review.candidates = []
      if (id === draft.config.activeMarketId)
        draft.config.questions = next
      else
        (draft.config.questionsByMarket ??= {})[id] = next
    })
    return snapshot(state)
  }

  return { getSnapshot, previewChange, confirmChange, saveMarketSelection }
}
