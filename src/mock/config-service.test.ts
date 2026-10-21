import { beforeEach, describe, expect, it } from 'vitest'
import { confirmRecommendation, getAvailableCompetitorRecommendations, getDictionary } from './config-service'
import { readMockState, resetMockState } from './repository'

describe('local competitor recommendation workflow', () => {
  beforeEach(() => resetMockState())

  it('keeps manually configured competitors separate from AI candidates and filters duplicates by domain or alias', () => {
    const available = getAvailableCompetitorRecommendations()
    const names = available.map(item => item.competitorName)

    expect(names).toContain('Shopify')
    expect(names).toContain('Flow X')
    expect(names).not.toContain('Webflow')
  })

  it('moves an accepted recommendation into the manual list exactly once', async () => {
    const id = await confirmRecommendation(201)
    await confirmRecommendation(201)
    const state = readMockState()

    expect(state.config.competitors.filter(item => item.competitorName === 'Shopify')).toHaveLength(1)
    expect(state.config.recommendations.find(item => item.recommendationId === 201)?.recommendationStatus).toBe('accepted')
    expect(getAvailableCompetitorRecommendations().some(item => item.recommendationId === 201)).toBe(false)
    expect(id).toBeGreaterThan(0)
  })
})

describe('local buyer persona dictionaries', () => {
  it('resolves enum codes to Chinese labels used by the persona cards and editor', async () => {
    const options = await getDictionary('persona_type')

    expect(options.find(item => item.dictValue === 'technical_lead')?.dictLabel).toBe('技术负责人')
    expect(options.find(item => item.dictValue === 'procurement_lead')?.dictLabel).toBe('采购负责人')
  })
})
