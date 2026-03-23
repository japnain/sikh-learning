import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomText } from '../types'

interface CustomTextsState {
  customTexts: CustomText[]
  addText: (text: Omit<CustomText, 'id' | 'addedAt'>) => void
  removeText: (id: string) => void
}

export const useCustomTextsStore = create<CustomTextsState>()(
  persist(
    (set) => ({
      customTexts: [],
      addText: (text) => set(state => ({
        customTexts: [...state.customTexts, {
          ...text,
          id: `custom-${Date.now()}`,
          addedAt: new Date().toISOString().split('T')[0],
        }],
      })),
      removeText: (id) => set(state => ({
        customTexts: state.customTexts.filter(t => t.id !== id),
      })),
    }),
    { name: 'sikh-custom-texts' }
  )
)
