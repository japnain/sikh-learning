import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LanguageState {
  hindiMode: boolean
  toggleHindi: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      hindiMode: false,
      toggleHindi: () => set(s => ({ hindiMode: !s.hindiMode })),
    }),
    { name: 'sikh-language' }
  )
)
