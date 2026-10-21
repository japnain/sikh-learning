import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BANIS } from '../data/banis'
import { toLocalDayStamp } from '../utils/localDates'
import { buildStudyRouteSearchParams, resolveStudyRouteSgLength } from '../utils/baniRouteResolver'
import { queueActivityEvent, useActivityEventsStore } from './activityEvents'
import { getNitnemCompletedIds, normalizeWeeklyDayGoal, useNitnemHistoryStore } from './nitnemHistory'

export type NitnemGroup = 'Morning' | 'Evening' | 'Night' | 'Additional'

export interface NitnemRouteOption {
  id: string
  baseBaniId: string
  name: string
  gurmukhiTitle: string
  romanizedTitle: string
  source: 'G' | 'D'
  startAng: number
  endAng: number
  group: NitnemGroup
  baniDbId?: number
  variant: 'standard' | 'adjustable' | 'exact-variant'
  variantLabel?: string
  supportsLengthAdjustment: boolean
  detail: string
}

type NitnemBaseBaniId =
  | 'japji-sahib'
  | 'jaap-sahib'
  | 'tav-prasad-savaiye'
  | 'chaupai-sahib'
  | 'anand-sahib'
  | 'rehras-sahib'
  | 'salok-mahalla-9'
  | 'sukhmani-sahib'
  | 'asa-di-var'
  | 'aarti'
  | 'laavan'
  | 'kirtan-sohila'

const NITNEM_META_BY_BANI_ID: Record<NitnemBaseBaniId, {
  group: NitnemGroup
  gurmukhiTitle: string
  romanizedTitle: string
  supportsLengthAdjustment: boolean
}> = {
  'japji-sahib': {
    group: 'Morning',
    gurmukhiTitle: 'ਜਪੁਜੀ ਸਾਹਿਬ',
    romanizedTitle: 'Japji Sahib',
    supportsLengthAdjustment: false,
  },
  'jaap-sahib': {
    group: 'Morning',
    gurmukhiTitle: 'ਜਾਪੁ ਸਾਹਿਬ',
    romanizedTitle: 'Jaap Sahib',
    supportsLengthAdjustment: false,
  },
  'tav-prasad-savaiye': {
    group: 'Morning',
    gurmukhiTitle: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ ਸ੍ਰਾਵਗ ਸੁੱਧ',
    romanizedTitle: 'Tav Prasad Savaiye',
    supportsLengthAdjustment: false,
  },
  'chaupai-sahib': {
    group: 'Morning',
    gurmukhiTitle: 'ਬੇਨਤੀ ਚੌਪਈ ਸਾਹਿਬ',
    romanizedTitle: 'Benati Chaupai Sahib',
    supportsLengthAdjustment: true,
  },
  'anand-sahib': {
    group: 'Morning',
    gurmukhiTitle: 'ਅਨੰਦੁ ਸਾਹਿਬ',
    romanizedTitle: 'Anand Sahib',
    supportsLengthAdjustment: false,
  },
  'rehras-sahib': {
    group: 'Evening',
    gurmukhiTitle: 'ਰਹਰਾਸਿ ਸਾਹਿਬ',
    romanizedTitle: 'Rehras Sahib',
    supportsLengthAdjustment: true,
  },
  'salok-mahalla-9': {
    group: 'Additional',
    gurmukhiTitle: 'ਸਲੋਕ ਮਹਲਾ ੯',
    romanizedTitle: 'Salok Mahalla 9',
    supportsLengthAdjustment: false,
  },
  'sukhmani-sahib': {
    group: 'Additional',
    gurmukhiTitle: 'ਸੁਖਮਨੀ ਸਾਹਿਬ',
    romanizedTitle: 'Sukhmani Sahib',
    supportsLengthAdjustment: false,
  },
  'asa-di-var': {
    group: 'Additional',
    gurmukhiTitle: 'ਆਸਾ ਦੀ ਵਾਰ',
    romanizedTitle: 'Asa Di Var',
    supportsLengthAdjustment: false,
  },
  aarti: {
    group: 'Additional',
    gurmukhiTitle: 'ਆਰਤੀ',
    romanizedTitle: 'Aarti',
    supportsLengthAdjustment: true,
  },
  laavan: {
    group: 'Additional',
    gurmukhiTitle: 'ਲਾਵਾਂ',
    romanizedTitle: 'Laavan',
    supportsLengthAdjustment: false,
  },
  'kirtan-sohila': {
    group: 'Night',
    gurmukhiTitle: 'ਸੋਹਿਲਾ ਸਾਹਿਬ',
    romanizedTitle: 'Kirtan Sohila',
    supportsLengthAdjustment: true,
  },
}

export const NITNEM_GROUP_ORDER: Record<NitnemRouteOption['group'], number> = {
  Morning: 0,
  Evening: 1,
  Night: 2,
  Additional: 3,
}

function createNitnemOption({
  id,
  baseBaniId,
  name,
  gurmukhiTitle,
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
  gurmukhiTitle?: string
  baniDbId?: number
  variant: NitnemRouteOption['variant']
  variantLabel?: string
  detail: string
  startAng?: number
  endAng?: number
}): NitnemRouteOption {
  const bani = BANIS.find(entry => entry.id === baseBaniId)
  const meta = NITNEM_META_BY_BANI_ID[baseBaniId]
  if (!bani || (bani.source !== 'G' && bani.source !== 'D') || !meta) {
    throw new Error(`Missing canonical Nitnem bani metadata for ${baseBaniId}`)
  }

  const romanizedTitle = variantLabel
    ? `${meta.romanizedTitle} · ${variantLabel}`
    : meta.romanizedTitle

  return {
    id,
    baseBaniId,
    name,
    gurmukhiTitle: gurmukhiTitle ?? meta.gurmukhiTitle,
    romanizedTitle,
    source: bani.source,
    startAng: startAng ?? bani.startAng,
    endAng: endAng ?? bani.endAng,
    group: meta.group,
    baniDbId,
    variant,
    variantLabel,
    supportsLengthAdjustment: meta.supportsLengthAdjustment,
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
    detail: 'Core morning bani.',
  }),
  createNitnemOption({
    id: 'jaap-sahib',
    baseBaniId: 'jaap-sahib',
    name: 'Jaap Sahib',
    baniDbId: 4,
    variant: 'standard',
    detail: 'Core morning bani.',
  }),
  createNitnemOption({
    id: 'tav-prasad-savaiye',
    baseBaniId: 'tav-prasad-savaiye',
    name: 'Tav Prasad Savaiye',
    baniDbId: 6,
    variant: 'standard',
    variantLabel: 'Sraavag Suddh',
    detail: 'Morning savaiye selection.',
  }),
  createNitnemOption({
    id: 'tav-prasad-savaiye-dheenan-ki',
    baseBaniId: 'tav-prasad-savaiye',
    name: 'Tav Prasad Savaiye (Dheenan Ki)',
    gurmukhiTitle: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ (ਦੀਨਨ ਕੀ)',
    baniDbId: 7,
    variant: 'exact-variant',
    variantLabel: 'Dheenan Ki',
    detail: 'Alternate morning savaiye route.',
    startAng: 11,
    endAng: 37,
  }),
  createNitnemOption({
    id: 'chaupai-sahib',
    baseBaniId: 'chaupai-sahib',
    name: 'Benati Chaupai Sahib',
    baniDbId: 9,
    variant: 'adjustable',
    detail: 'Length options appear inside the reader.',
  }),
  createNitnemOption({
    id: 'anand-sahib',
    baseBaniId: 'anand-sahib',
    name: 'Anand Sahib',
    baniDbId: 10,
    variant: 'standard',
    detail: 'Core Anand Sahib selection.',
  }),
  createNitnemOption({
    id: 'rehras-sahib',
    baseBaniId: 'rehras-sahib',
    name: 'Rehras Sahib',
    baniDbId: 21,
    variant: 'adjustable',
    detail: 'Length options appear inside the reader.',
  }),
  createNitnemOption({
    id: 'salok-mahalla-9',
    baseBaniId: 'salok-mahalla-9',
    name: 'Salok Mahalla 9',
    baniDbId: 30,
    variant: 'standard',
    detail: 'Closing saloks for reflection.',
  }),
  createNitnemOption({
    id: 'sukhmani-sahib',
    baseBaniId: 'sukhmani-sahib',
    name: 'Sukhmani Sahib',
    baniDbId: 31,
    variant: 'standard',
    detail: 'Long-form bani for settled recitation.',
  }),
  createNitnemOption({
    id: 'asa-di-var',
    baseBaniId: 'asa-di-var',
    name: 'Asa Di Var',
    baniDbId: 90,
    variant: 'standard',
    detail: 'Morning var for extended reading.',
  }),
  createNitnemOption({
    id: 'aarti',
    baseBaniId: 'aarti',
    name: 'Aarti',
    baniDbId: 22,
    variant: 'adjustable',
    detail: 'Length options appear inside the reader.',
  }),
  createNitnemOption({
    id: 'laavan',
    baseBaniId: 'laavan',
    name: 'Laavan',
    baniDbId: 11,
    variant: 'standard',
    detail: 'Wedding hymns for ceremonial reading.',
  }),
  createNitnemOption({
    id: 'kirtan-sohila',
    baseBaniId: 'kirtan-sohila',
    name: 'Kirtan Sohila',
    baniDbId: 23,
    variant: 'adjustable',
    detail: 'Length options appear inside the reader.',
  }),
]

export const NITNEM_ROUTE_ORDER: Record<NitnemRouteOption['id'], number> = NITNEM_ROUTE_OPTIONS.reduce(
  (order, option, index) => {
    order[option.id] = index
    return order
  },
  {} as Record<NitnemRouteOption['id'], number>
)

export function compareNitnemOptions(left: NitnemRouteOption, right: NitnemRouteOption): number {
  return NITNEM_GROUP_ORDER[left.group] - NITNEM_GROUP_ORDER[right.group]
    || NITNEM_ROUTE_ORDER[left.id] - NITNEM_ROUTE_ORDER[right.id]
    || left.name.localeCompare(right.name)
}

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
  completionTrackingEnabled: boolean
  weeklyDayGoal: number
  setWeeklyDayGoal: (goal: number) => void
  setSelectedIds: (ids: string[]) => void
  markComplete: (id: string) => void
  unmarkComplete: (id: string) => void
  isComplete: (id: string) => boolean
  setCompletionTrackingEnabled: (enabled: boolean) => void
  toggleSelected: (id: string) => void
  moveSelected: (id: string, direction: 'up' | 'down') => void
  isSelected: (id: string) => boolean
  resetSelections: () => void
  resetIfNewDay: () => void
}

function nextCompletionTimestamp(id: string, date: string): string {
  const latest = useNitnemHistoryStore.getState().events
    .filter(event => event.optionId === id && event.date === date)
    .reduce((value, event) => Math.max(value, Date.parse(event.occurredAt)), 0)
  return new Date(Math.max(Date.now(), latest + 1)).toISOString()
}

function todayStr() {
  return toLocalDayStamp(new Date())
}

export function getNitnemOption(optionId: string): NitnemRouteOption | null {
  return NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null
}

export function buildNitnemStudyPath(option: NitnemRouteOption): string {
  const sgLength = resolveStudyRouteSgLength({
    baniId: option.baseBaniId,
    baniDbId: option.baniDbId,
  })
  const params = buildStudyRouteSearchParams({
    source: option.source,
    startAng: option.startAng,
    endAng: option.endAng,
    bani: option.name,
    baniDbId: option.baniDbId,
    baniId: option.baseBaniId,
    sgLength,
  })

  return `/study?${params.toString()}`
}

const LEGACY_NITNEM_ID_MAP: Record<string, string> = {
  'rehras-sahib-focused': 'rehras-sahib',
  'chaupai-sahib-focused': 'chaupai-sahib',
}

export function normalizePersistedNitnemIds(
  ids: unknown,
  fallbackToDefault: boolean = true
): string[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    return fallbackToDefault ? [...DEFAULT_NITNEM_OPTION_IDS] : []
  }

  const normalized = ids
    .filter((id): id is string => typeof id === 'string')
    .map(id => LEGACY_NITNEM_ID_MAP[id] ?? id)
    .filter(id => Boolean(getNitnemOption(id)))

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : (fallbackToDefault ? [...DEFAULT_NITNEM_OPTION_IDS] : [])
}

export const useNitemStore = create<NitemState>()(
  persist(
    (set, get) => ({
      completedDate: todayStr(),
      completedIds: [],
      selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
      completionTrackingEnabled: true,
      weeklyDayGoal: 7,
      setWeeklyDayGoal: goal => set({ weeklyDayGoal: normalizeWeeklyDayGoal(goal) }),
      setSelectedIds: ids => {
        const selectedIds = normalizePersistedNitnemIds(ids, false)
        if (selectedIds.length) set({ selectedIds })
      },

      markComplete: (id) => {
        const today = todayStr()
        const state = get()
        if (!getNitnemOption(id) || !state.selectedIds.includes(id)) return
        useNitnemHistoryStore.getState().importLegacy(state.completedDate, normalizePersistedNitnemIds(state.completedIds, false))
        const base = state.completedDate === today ? normalizePersistedNitnemIds(state.completedIds, false) : []
        if (base.includes(id)) return
        const occurredAt = nextCompletionTimestamp(id, today)
        const event = queueActivityEvent('nitnem.completed', { id, completedDate: today }, occurredAt)
        useNitnemHistoryStore.getState().record({
          id: event.id, optionId: id, date: today, completed: true,
          occurredAt, source: 'manual', wasSelected: true,
        })
        set({ completedDate: today, completedIds: [...base, id] })
      },

      unmarkComplete: (id) => {
        const today = todayStr()
        const state = get()
        if (!getNitnemOption(id)) return
        useNitnemHistoryStore.getState().importLegacy(state.completedDate, normalizePersistedNitnemIds(state.completedIds, false))
        const base = state.completedDate === today ? normalizePersistedNitnemIds(state.completedIds, false) : []
        if (!base.includes(id)) return
        const occurredAt = nextCompletionTimestamp(id, today)
        const event = queueActivityEvent('nitnem.uncompleted', { id, completedDate: today }, occurredAt)
        useNitnemHistoryStore.getState().record({
          id: event.id, optionId: id, date: today, completed: false,
          occurredAt, source: 'manual', wasSelected: true,
        })
        set({ completedDate: today, completedIds: base.filter(value => value !== id) })
      },

      isComplete: (id) => {
        const s = get()
        return s.completedDate === todayStr() && s.completedIds.includes(id)
      },

      setCompletionTrackingEnabled: (enabled) => {
        set({ completionTrackingEnabled: enabled })
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
          })
          return
        }

        const nextIds = [...state.selectedIds, id]

        set({ selectedIds: nextIds })
      },

      moveSelected: (id, direction) => {
        const state = get()
        const currentIndex = state.selectedIds.indexOf(id)
        if (currentIndex === -1) return

        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (nextIndex < 0 || nextIndex >= state.selectedIds.length) return

        const nextIds = [...state.selectedIds]
        const [movedId] = nextIds.splice(currentIndex, 1)
        nextIds.splice(nextIndex, 0, movedId)
        set({ selectedIds: nextIds })
      },

      isSelected: (id) => {
        return get().selectedIds.includes(id)
      },

      resetSelections: () => {
        set({ selectedIds: [...DEFAULT_NITNEM_OPTION_IDS] })
      },

      resetIfNewDay: () => {
        const s = get()
        useNitnemHistoryStore.getState().importLegacy(s.completedDate, normalizePersistedNitnemIds(s.completedIds, false))
        if (s.completedDate !== todayStr()) {
          set({ completedDate: todayStr(), completedIds: getNitnemCompletedIds(useNitnemHistoryStore.getState().events, todayStr()) })
        }
      },
    }),
    {
      name: 'sikh-nitnem',
      version: 5,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<NitemState>
        return {
          completedDate: state.completedDate ?? todayStr(),
          completedIds: normalizePersistedNitnemIds(state.completedIds, false),
          selectedIds: normalizePersistedNitnemIds(state.selectedIds),
          completionTrackingEnabled: true,
          weeklyDayGoal: normalizeWeeklyDayGoal(state.weeklyDayGoal),
        }
      },
      merge: (persisted, current) => {
        const state = (persisted ?? {}) as Partial<NitemState>
        const completedDate = typeof state.completedDate === 'string' ? state.completedDate : todayStr()
        const completedIds = normalizePersistedNitnemIds(state.completedIds, false)
        useNitnemHistoryStore.getState().importLegacy(completedDate, completedIds)
        return {
          ...current,
          completedDate,
          completedIds: getNitnemCompletedIds(useNitnemHistoryStore.getState().events, completedDate),
          selectedIds: normalizePersistedNitnemIds(state.selectedIds),
          completionTrackingEnabled: state.completionTrackingEnabled ?? true,
          weeklyDayGoal: normalizeWeeklyDayGoal(state.weeklyDayGoal),
        }
      },
    }
  )
)

export type NitnemCompletionResult = 'changed' | 'unchanged' | 'unavailable' | 'failed'

/** Keep an explicit completion honest if any of its three local writes fails. */
export function setNitnemCompletionSafely(id: string, completed: boolean): NitnemCompletionResult {
  const routine = useNitemStore.getState()
  if (!routine.completionTrackingEnabled || !routine.selectedIds.includes(id) || !getNitnemOption(id)) return 'unavailable'
  if (routine.isComplete(id) === completed) return 'unchanged'
  const history = useNitnemHistoryStore.getState()
  const activity = useActivityEventsStore.getState()
  const keys = ['sikh-nitnem', 'naamras-nitnem-history', 'naamras-cloud-activity-events']
  let persisted: (string | null)[]
  try {
    persisted = keys.map(key => localStorage.getItem(key))
  } catch {
    return 'failed'
  }
  try {
    if (completed) routine.markComplete(id)
    else routine.unmarkComplete(id)
    return 'changed'
  } catch {
    // Zustand persistence updates memory before writing. Restore both sides; a
    // storage exception must not leave an apparently successful completion.
    const rollbacks = [
      () => useNitemStore.setState({ completedDate: routine.completedDate, completedIds: routine.completedIds }),
      () => useNitnemHistoryStore.setState({ events: history.events }),
      () => useActivityEventsStore.setState({ pendingEvents: activity.pendingEvents }),
    ]
    for (const rollback of rollbacks) {
      try { rollback() } catch { /* The memory update still precedes a failed write. */ }
    }
    keys.forEach((key, index) => {
      try {
        if (persisted[index] === null) localStorage.removeItem(key)
        else localStorage.setItem(key, persisted[index]!)
      } catch { /* Keep the UI retryable when device storage remains unavailable. */ }
    })
    return 'failed'
  }
}
