import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BANIS } from '../data/banis'
import { toLocalDayStamp } from '../utils/learnDates'
import { buildStudyRouteSearchParams } from '../utils/baniRouteResolver'

export interface NitnemRouteOption {
  id: string
  baseBaniId: string
  name: string
  source: 'G' | 'D'
  startAng: number
  endAng: number
  time: 'Morning' | 'Evening' | 'Night'
  baniDbId?: number
  variant: 'standard' | 'focused' | 'puraatan' | 'exact-variant'
  variantLabel?: string
  detail: string
}

type NitnemBaseBaniId =
  | 'japji-sahib'
  | 'jaap-sahib'
  | 'tav-prasad-savaiye'
  | 'chaupai-sahib'
  | 'anand-sahib'
  | 'rehras-sahib'
  | 'kirtan-sohila'

const NITNEM_TIME_BY_BANI_ID: Record<NitnemBaseBaniId, NitnemRouteOption['time']> = {
  'japji-sahib': 'Morning',
  'jaap-sahib': 'Morning',
  'tav-prasad-savaiye': 'Morning',
  'chaupai-sahib': 'Morning',
  'anand-sahib': 'Morning',
  'rehras-sahib': 'Evening',
  'kirtan-sohila': 'Night',
}

const NITNEM_TIME_ORDER: Record<NitnemRouteOption['time'], number> = {
  Morning: 0,
  Evening: 1,
  Night: 2,
}

function createNitnemOption({
  id,
  baseBaniId,
  name,
  baniDbId,
  variant,
  variantLabel,
  detail,
  startAng,
  endAng,
}: {
  id: string
  baseBaniId: NitnemBaseBaniId
  name: string
  baniDbId?: number
  variant: NitnemRouteOption['variant']
  variantLabel?: string
  detail: string
  startAng?: number
  endAng?: number
}): NitnemRouteOption {
  const bani = BANIS.find(entry => entry.id === baseBaniId)
  const time = NITNEM_TIME_BY_BANI_ID[baseBaniId]
  if (!bani || (bani.source !== 'G' && bani.source !== 'D') || !time) {
    throw new Error(`Missing canonical Nitnem bani metadata for ${baseBaniId}`)
  }

  return {
    id,
    baseBaniId,
    name,
    source: bani.source,
    startAng: startAng ?? bani.startAng,
    endAng: endAng ?? bani.endAng,
    time,
    baniDbId,
    variant,
    variantLabel,
    detail,
  }
}

export const NITNEM_ROUTE_OPTIONS: NitnemRouteOption[] = [
  createNitnemOption({
    id: 'japji-sahib',
    baseBaniId: 'japji-sahib',
    name: 'Japji Sahib',
    baniDbId: 2,
    variant: 'standard',
    detail: 'Core morning bani in its exact BaniDB composition.',
  }),
  createNitnemOption({
    id: 'jaap-sahib',
    baseBaniId: 'jaap-sahib',
    name: 'Jaap Sahib',
    baniDbId: 4,
    variant: 'standard',
    detail: 'Core morning bani in its exact BaniDB composition.',
  }),
  createNitnemOption({
    id: 'tav-prasad-savaiye',
    baseBaniId: 'tav-prasad-savaiye',
    name: 'Tav Prasad Savaiye',
    baniDbId: 6,
    variant: 'standard',
    variantLabel: 'Sraavag Suddh',
    detail: 'Standard Nitnem Savaiye composition.',
  }),
  createNitnemOption({
    id: 'tav-prasad-savaiye-dheenan-ki',
    baseBaniId: 'tav-prasad-savaiye',
    name: 'Tav Prasad Savaiye (Dheenan Ki)',
    baniDbId: 7,
    variant: 'exact-variant',
    variantLabel: 'Dheenan Ki',
    detail: 'Alternate exact BaniDB variant where the API exposes a distinct composition.',
    startAng: 11,
    endAng: 37,
  }),
  createNitnemOption({
    id: 'chaupai-sahib',
    baseBaniId: 'chaupai-sahib',
    name: 'Chaupai Sahib (Puraatan)',
    baniDbId: 9,
    variant: 'puraatan',
    variantLabel: 'Puraatan',
    detail: 'Full composite reader with the traditional extended flow.',
  }),
  createNitnemOption({
    id: 'chaupai-sahib-focused',
    baseBaniId: 'chaupai-sahib',
    name: 'Chaupai Sahib (Focused)',
    variant: 'focused',
    variantLabel: 'Focused',
    detail: 'Bounded Dasam-only reading for a shorter, tighter reader view.',
  }),
  createNitnemOption({
    id: 'anand-sahib',
    baseBaniId: 'anand-sahib',
    name: 'Anand Sahib',
    baniDbId: 10,
    variant: 'standard',
    detail: 'Core Anand Sahib exact composition.',
  }),
  createNitnemOption({
    id: 'rehras-sahib',
    baseBaniId: 'rehras-sahib',
    name: 'Rehras Sahib (Puraatan)',
    baniDbId: 21,
    variant: 'puraatan',
    variantLabel: 'Puraatan',
    detail: 'Full composite reader with SGGS, DG, and Anand Sahib sections intact.',
  }),
  createNitnemOption({
    id: 'rehras-sahib-focused',
    baseBaniId: 'rehras-sahib',
    name: 'Rehras Sahib (Focused)',
    variant: 'focused',
    variantLabel: 'Focused',
    detail: 'Bounded SGGS-only reading for a shorter evening reader.',
  }),
  createNitnemOption({
    id: 'kirtan-sohila',
    baseBaniId: 'kirtan-sohila',
    name: 'Kirtan Sohila',
    baniDbId: 23,
    variant: 'standard',
    detail: 'Core night bani in its exact BaniDB composition.',
  }),
]

export const DEFAULT_NITNEM_OPTION_IDS = [
  'japji-sahib',
  'jaap-sahib',
  'tav-prasad-savaiye',
  'chaupai-sahib',
  'anand-sahib',
  'rehras-sahib',
  'kirtan-sohila',
] as const

export const NITNEM_BANIS: NitnemRouteOption[] = DEFAULT_NITNEM_OPTION_IDS.map(id => {
  const option = NITNEM_ROUTE_OPTIONS.find(entry => entry.id === id)
  if (!option) {
    throw new Error(`Missing default Nitnem route option for ${id}`)
  }
  return option
})

interface NitemState {
  completedDate: string
  completedIds: string[]
  selectedIds: string[]
  markComplete: (id: string) => void
  unmarkComplete: (id: string) => void
  isComplete: (id: string) => boolean
  toggleSelected: (id: string) => void
  isSelected: (id: string) => boolean
  resetSelections: () => void
  resetIfNewDay: () => void
}

function todayStr() {
  return toLocalDayStamp(new Date())
}

export function getNitnemOption(optionId: string): NitnemRouteOption | null {
  return NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null
}

export function buildNitnemStudyPath(option: NitnemRouteOption): string {
  const params = buildStudyRouteSearchParams({
    source: option.source,
    startAng: option.startAng,
    endAng: option.endAng,
    bani: option.name,
    baniDbId: option.baniDbId,
    baniId: option.baseBaniId,
  })

  return `/study?${params.toString()}`
}

export const useNitemStore = create<NitemState>()(
  persist(
    (set, get) => ({
      completedDate: todayStr(),
      completedIds: [],
      selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],

      markComplete: (id) => {
        const today = todayStr()
        const s = get()
        const base = s.completedDate === today ? s.completedIds : []
        if (!base.includes(id)) {
          set({ completedDate: today, completedIds: [...base, id] })
        }
      },

      unmarkComplete: (id) => {
        const today = todayStr()
        const s = get()
        const base = s.completedDate === today ? s.completedIds : []
        set({ completedDate: today, completedIds: base.filter(x => x !== id) })
      },

      isComplete: (id) => {
        const s = get()
        return s.completedDate === todayStr() && s.completedIds.includes(id)
      },

      toggleSelected: (id) => {
        const option = getNitnemOption(id)
        if (!option) return

        const state = get()
        const exists = state.selectedIds.includes(id)

        if (exists) {
          if (state.selectedIds.length === 1) return
          set({
            selectedIds: state.selectedIds.filter(entryId => entryId !== id),
            completedIds: state.completedIds.filter(entryId => entryId !== id),
          })
          return
        }

        const nextIds = [...state.selectedIds, id]
        const nextOptions = nextIds
          .map(entryId => getNitnemOption(entryId))
          .filter((entry): entry is NitnemRouteOption => entry !== null)
          .sort((left, right) =>
            NITNEM_TIME_ORDER[left.time] - NITNEM_TIME_ORDER[right.time]
            || left.startAng - right.startAng
            || left.name.localeCompare(right.name)
          )

        set({ selectedIds: nextOptions.map(entry => entry.id) })
      },

      isSelected: (id) => {
        return get().selectedIds.includes(id)
      },

      resetSelections: () => {
        set({ selectedIds: [...DEFAULT_NITNEM_OPTION_IDS] })
      },

      resetIfNewDay: () => {
        const s = get()
        if (s.completedDate !== todayStr()) {
          set({ completedDate: todayStr(), completedIds: [] })
        }
      },
    }),
    {
      name: 'sikh-nitnem',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<NitemState>
        return {
          completedDate: state.completedDate ?? todayStr(),
          completedIds: state.completedIds ?? [],
          selectedIds: state.selectedIds && state.selectedIds.length > 0
            ? state.selectedIds.filter(id => Boolean(getNitnemOption(id)))
            : [...DEFAULT_NITNEM_OPTION_IDS],
        }
      },
    }
  )
)
