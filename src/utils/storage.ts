type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const fallbackStore = new Map<string, string>()

const fallbackStorage: StorageLike = {
  getItem(key) {
    return fallbackStore.get(key) ?? null
  },
  setItem(key, value) {
    fallbackStore.set(key, value)
  },
  removeItem(key) {
    fallbackStore.delete(key)
  },
}

export function getAppStorage(): StorageLike {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage
  }
  return fallbackStorage
}

export function clearFallbackStorage(): void {
  fallbackStore.clear()
}
