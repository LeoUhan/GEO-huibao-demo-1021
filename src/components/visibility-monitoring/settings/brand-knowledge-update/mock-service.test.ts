import type { KnowledgeItem } from '../../../../types'
import { beforeEach, describe, expect, it } from 'vitest'
import { switchMarket } from '../../../../mock/config-service'
import { getRoundDetail, getSchedule, triggerRound } from '../../../../mock/monitoring-service'
import { readMockState, resetMockState, updateMockState } from '../../../../mock/repository'
import { createMockBrandKnowledgeUpdateService } from './mock-service'

const knowledgeItems: KnowledgeItem[] = [{ id: 'brand', index: '01', title: '品牌信息', summary: '', requirements: '', brand: { name: 'APW Waterjet', alias: 'APW, APW Waterjet', website: 'https://www.apwwaterjet.com', industry: '工业制造', description: '更新品牌定位' } }]

describe('brand knowledge update mock service', () => {
  beforeEach(() => resetMockState())

  it('previews the market scope and detects identification changes without writing the draft', async () => {
    const service = createMockBrandKnowledgeUpdateService()
    const before = await service.getSnapshot()
    const impact = await service.previewChange(knowledgeItems)
    expect(impact.affectedMarkets).toEqual(['德国 · 德语', '美国 · 英语', '法国 · 法语'])
    expect(impact).toMatchObject({ editCost: 1, remainingEdits: 1, brandBaseline: false, citationBaseline: false })
    expect(await service.getSnapshot()).toEqual(before)

    const changed = [{ ...knowledgeItems[0]!, brand: { ...knowledgeItems[0]!.brand!, alias: 'APW, New Alias', website: 'https://new.example' } }]
    expect(await service.previewChange(changed)).toMatchObject({ brandBaseline: true, citationBaseline: true })
  })

  it('saves the brand before candidates finish generating and preserves all market states and questions', async () => {
    const service = createMockBrandKnowledgeUpdateService()
    const before = await service.getSnapshot()
    const saving = service.confirmChange(knowledgeItems)
    expect(readMockState().config.brand.positioning).toBe('更新品牌定位')
    const result = await saving

    expect(result.markets.map(item => item.enabled)).toEqual([true, true, false])
    expect(result.markets.every(item => item.candidates.length > 0)).toBe(true)
    expect(result.markets.map(item => item.existingQuestions)).toEqual(before.markets.map(item => item.existingQuestions))
    expect(result.editQuota.remaining).toBe(1)
    expect((await getRoundDetail(await triggerRound())).questionBaseline).toBe(false)
  })

  it('applies questions to each market independently, including an already paused market', async () => {
    const service = createMockBrandKnowledgeUpdateService()
    const initial = await service.confirmChange(knowledgeItems)
    const [germany, , france] = initial.markets
    const removed = germany!.existingQuestions[0]!
    const selected = germany!.candidates[0]!

    const saved = await service.saveMarketSelection(germany!.id, [selected.id, selected.id], [removed.id])
    expect(saved.markets[0]).toMatchObject({ enabled: true, processed: true, processedAddedCount: 1, processedRemovedCount: 1 })
    expect(saved.markets[0]!.existingQuestions.map(item => item.question)).toContain(selected.question)
    expect(saved.markets[0]!.existingQuestions.map(item => item.id)).not.toContain(removed.id)
    expect(saved.markets[2]).toEqual(france)

    await service.saveMarketSelection(france!.id, [france!.candidates[0]!.id])
    await switchMarket(Number(france!.id))
    expect((await getSchedule())?.enabled).toBe(0)
    expect(readMockState().config.questions).toHaveLength(1)
    await switchMarket(Number(germany!.id))
    expect((await getSchedule())?.enabled).toBe(1)
    expect(readMockState().config.questions).toHaveLength(germany!.existingQuestions.length)
  })

  it('keeps the existing question set on ignore and restores processed state after reopening', async () => {
    const service = createMockBrandKnowledgeUpdateService()
    const initial = await service.confirmChange(knowledgeItems)
    const market = initial.markets[0]!
    await expect(service.saveMarketSelection(market.id, ['unknown-id'])).rejects.toThrow(/候选/)
    await service.saveMarketSelection(market.id, [])
    const restored = (await createMockBrandKnowledgeUpdateService().getSnapshot()).markets[0]!
    expect(restored).toMatchObject({ processed: true, candidates: [], existingQuestions: market.existingQuestions })
  })

  it('rejects confirmation when no edit quota remains', async () => {
    updateMockState((draft) => { draft.config.brandReview = { remaining: 0, markets: {} } })
    await expect(createMockBrandKnowledgeUpdateService().confirmChange(knowledgeItems)).rejects.toThrow(/次数/)
  })
})
