import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LanguageState {
  hindiMode: boolean
  toggleHindi: () => void
  fontSize: number
  setFontSize: (n: number) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      hindiMode: false,
      toggleHindi: () => set(s => ({ hindiMode: !s.hindiMode })),
      fontSize: 22,
      setFontSize: (n) => set({ fontSize: n }),
    }),
    { name: 'sikh-language' }
  )
)
