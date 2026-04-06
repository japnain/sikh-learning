import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
    { name: 'sikh-ui-locale' }
  )
)
