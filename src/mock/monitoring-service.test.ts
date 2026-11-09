import { beforeEach, describe, expect, it } from 'vitest'
import { replaceMonitoringQuestions, saveBrandInfo } from './config-service'
import { getQuestionHits, getRoundDetail, getRounds, getSchedule, pauseMonitoring, resumeMonitoring, saveSchedule, triggerRound } from './monitoring-service'
import { readMockState, resetMockState, updateMockState } from './repository'

describe('local monitoring workflow', () => {
  beforeEach(() => resetMockState())

  it('reads seeded rounds and schedule without a backend', async () => {
    expect((await getRounds({ pageSize: 1 })).total).toBeGreaterThan(1)
    expect((await getSchedule())?.enabled).toBe(1)
  })

  it('persists pause, resume, schedule changes, and a new sampling round', async () => {
    await pauseMonitoring()
    expect((await getSchedule())?.enabled).toBe(0)
    await resumeMonitoring()
    await saveSchedule({ scheduleType: 'monthly', executeTime: '周三 09:30', repeatCount: 1 })
    expect((await getSchedule())?.executeTime).toBe('周三 09:30')
    const before = (await getRounds()).total
    await triggerRound()
    expect((await getRounds()).total).toBe(before + 1)
  })

  it('locks questions per round and uses the new baseline only after resuming a paused schedule', async () => {
    const oldRound = (await getRounds()).records[0]!
    const before = await getQuestionHits(oldRound.id)
    const [first, second, ...rest] = readMockState().config.questions
    await pauseMonitoring()
    await replaceMonitoringQuestions([
      { ...first!, questionContent: '修改后的监测问题' },
      ...rest,
      { ...second!, id: undefined, questionContent: '新增的监测问题' },
    ])
    expect((await getSchedule())?.enabled).toBe(0)
    expect(await getQuestionHits(await triggerRound())).toEqual(before)

    await resumeMonitoring()
    const nextId = await triggerRound()
    expect(await getRoundDetail(nextId)).toMatchObject({ questionBaseline: true, brandBaseline: false, citationBaseline: false })
    const nextHits = await getQuestionHits(nextId)
    expect(nextHits.map(item => item.questionContent)).toEqual(expect.arrayContaining(['修改后的监测问题', '新增的监测问题']))
    expect(nextHits.some(item => item.questionId === second!.id)).toBe(false)
    expect(nextHits.every(item => item.trend === null)).toBe(true)
    expect(await getQuestionHits(oldRound.id)).toEqual(before)
    expect((await getRoundDetail(await triggerRound())).questionBaseline).toBe(false)
  })

  it('creates a baseline only for the brand metrics affected by the change', async () => {
    const { brand } = readMockState().config
    await saveBrandInfo({ ...brand, positioning: '描述更新' })
    expect(await getRoundDetail(await triggerRound())).toMatchObject({ brandBaseline: false, citationBaseline: false })
    updateMockState((draft) => { draft.config.brand.siteUrl = 'https://new.example' })
    expect(await getRoundDetail(await triggerRound())).toMatchObject({ questionBaseline: false, brandBaseline: false, citationBaseline: true })
  })

})
