import type { MockState } from './state'
import { createSeedState } from './seed'

export const MOCK_STORAGE_KEY = 'geo-agent-web-mock:v1'

function cloneState(state: MockState): MockState {
  return structuredClone(state)
}

function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  }
  catch {
    return undefined
  }
}

function save(storage: Storage | undefined, state: MockState): void {
  try {
    storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(state))
  }
  catch {
    // The demo remains usable in private browsing modes that deny storage access.
  }
}

export function readMockState(storage = getBrowserStorage()): MockState {
  if (!storage)
    return createSeedState()

  try {
    const raw = storage.getItem(MOCK_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed && parsed.schemaVersion === 1 && 'config' in parsed && 'monitoring' in parsed) {
        return cloneState(parsed as MockState)
      }
    }
  }
  catch {
    // A malformed or inaccessible value is replaced with a complete seed below.
  }

  const seed = createSeedState()
  save(storage, seed)
  return cloneState(seed)
}

export function updateMockState(mutator: (draft: MockState) => void, storage = getBrowserStorage()): MockState {
  const draft = readMockState(storage)
  mutator(draft)
  draft.revision += 1
  save(storage, draft)
  return cloneState(draft)
}

export function resetMockState(storage = getBrowserStorage()): MockState {
  const seed = createSeedState()
  save(storage, seed)
  return cloneState(seed)
}
