import { useEffect, useState } from "react"

export const UI_DISCLOSURE_STORAGE_KEY = "naamras-ui-disclosure"

type DisclosureStateMap = Record<string, boolean>

function isDisclosureStateMap(value: unknown): value is DisclosureStateMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(entry => typeof entry === "boolean")
}

function readDisclosureStateMap(): DisclosureStateMap {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(UI_DISCLOSURE_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed: unknown = JSON.parse(raw)
    return isDisclosureStateMap(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeDisclosureStateMap(nextState: DisclosureStateMap) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(UI_DISCLOSURE_STORAGE_KEY, JSON.stringify(nextState))
  } catch {
    // Ignore storage failures and keep the UI usable.
  }
}

function getDisclosureValue(storageKey: string | null, defaultOpen: boolean) {
  if (!storageKey) {
    return defaultOpen
  }

  const stored = readDisclosureStateMap()
  return stored[storageKey] ?? defaultOpen
}

export function usePersistentDisclosure(storageKey: string | null, defaultOpen = false) {
  const [open, setOpen] = useState(() => getDisclosureValue(storageKey, defaultOpen))

  useEffect(() => {
    setOpen(getDisclosureValue(storageKey, defaultOpen))
  }, [defaultOpen, storageKey])

  useEffect(() => {
    if (!storageKey) {
      return
    }

    const current = readDisclosureStateMap()
    if (current[storageKey] === open) {
      return
    }

    writeDisclosureStateMap({
      ...current,
      [storageKey]: open,
    })
  }, [open, storageKey])

  return [open, setOpen] as const
}
