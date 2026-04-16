const localStorageState = new Map<string, string>()
const sessionStorageState = new Map<string, string>()

function createStorage(state: Map<string, string>): Storage {
  return {
    getItem: key => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value)
    },
    removeItem: key => {
      state.delete(key)
    },
    clear: () => {
      state.clear()
    },
    key: index => Array.from(state.keys())[index] ?? null,
    get length() {
      return state.size
    },
  }
}

const localStorageMock = createStorage(localStorageState)
const sessionStorageMock = createStorage(sessionStorageState)

function installStorageProperty(key: "localStorage" | "sessionStorage", value: Storage) {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
  })

  if (typeof window !== "undefined") {
    Object.defineProperty(window, key, {
      value,
      configurable: true,
    })
  }
}

installStorageProperty("localStorage", localStorageMock)
installStorageProperty("sessionStorage", sessionStorageMock)

export function resetMockStorage() {
  localStorageMock.clear()
  sessionStorageMock.clear()
}
