import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getActivePersonalStorage } from '../utils/ownerStorage'
import { registerPersonalStore } from '../utils/ownerStore'
import type { UiLocale } from '../types'

interface LocaleState {
  locale: UiLocale
  setLocale: (locale: UiLocale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'sikh-ui-locale', storage: createJSONStorage(getActivePersonalStorage), }
  )
)

registerPersonalStore(useLocaleStore)
