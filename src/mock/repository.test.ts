import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_STORAGE_KEY, readMockState, resetMockState, updateMockState } from './repository'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('mock repository', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createStorage()
  })

  it('initializes and persists a complete seed state on first read', () => {
    const state = readMockState(storage)

    expect(state.schemaVersion).toBe(1)
    expect(state.config.personas.length).toBeGreaterThan(0)
    expect(state.monitoring.questions.length).toBeGreaterThan(0)
    expect(JSON.parse(storage.getItem(MOCK_STORAGE_KEY)!).revision).toBe(0)
  })

  it('persists updates and returns independent snapshots', () => {
    const updated = updateMockState((state) => {
      state.config.brand.brandName = '本地演示品牌'
    }, storage)
    updated.config.brand.brandName = '外部修改'

    expect(readMockState(storage).config.brand.brandName).toBe('本地演示品牌')
    expect(readMockState(storage).revision).toBe(1)
  })

  it('recovers from malformed or unsupported stored data', () => {
    storage.setItem(MOCK_STORAGE_KEY, '{broken')
    expect(readMockState(storage).schemaVersion).toBe(1)

    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }))
    expect(readMockState(storage).schemaVersion).toBe(1)
    expect(readMockState(storage).config.brand.brandName).toBeTruthy()
  })

  it('reset restores the initial seed state', () => {
    updateMockState((state) => { state.config.brand.brandName = '已修改' }, storage)
    const reset = resetMockState(storage)

    expect(reset.config.brand.brandName).not.toBe('已修改')
    expect(readMockState(storage).revision).toBe(0)
  })
})
