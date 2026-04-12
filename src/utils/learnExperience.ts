import {
  COLLECTIONS,
  COLLECTION_BY_ID,
  DAILY_GUIDANCE_BY_ID,
  DAILY_GUIDANCE_ENTRIES,
  getLearnItemKind,
  LEARN_CONTENT_TARGETS,
  LEARN_SEARCH_SYNONYMS,
  SHABAD_DEEP_DIVES,
  SHABAD_DEEP_DIVE_BY_ID,
  TOPIC_GUIDES,
  TOPIC_GUIDE_BY_ID,
} from "../data/learnContent"
import type {
  Collection,
  DailyGuidance,
  LearnContentKind,
  LearnItemView,
  LearnLineReference,
  ShabadDeepDive,
  TopicGuide,
  UserLearningState,
} from "../types"
import { dayDiffLocal, parseLocalDayStamp, toLocalDayStamp } from "./learnDates"

type RotationSlot = "daily_guidance" | "featured_shabad" | "topic_spotlight"

type RotatingItem = DailyGuidance | ShabadDeepDive | TopicGuide

type RotationSelection<T extends RotatingItem> = {
  item: T
  reason: string
  fallbackApplied: boolean
  inventoryLimited: boolean
}

export type LearnResolvedExcerpt = {
  deepDive: ShabadDeepDive
  lines: ShabadDeepDive["lines"]
  shortMeaning: string
  lifeApplication: string
}

export type LearnSavedItem = {
  id: string
  kind: LearnContentKind
  title: string
  subtitle: string
  detail: string
  theme: string
}

export type ContinueLearningCard =
  | {
      kind: "collection"
      title: string
      body: string
      collection: Collection
    }
  | {
      kind: "topic"
      title: string
      body: string
      topic: TopicGuide
    }

export type TodayLearnSurface = {
  dayStamp: string
  dailyGuidance: RotationSelection<DailyGuidance>
  featuredShabad: RotationSelection<ShabadDeepDive>
  topicSpotlight: RotationSelection<TopicGuide>
  continueLearning: ContinueLearningCard
  themeRail: TopicGuide[]
  featuredCollections: Collection[]
  exploreCollections: Collection[]
  inventory: ReturnType<typeof getLearnInventorySummary>
}

const SLOT_CONFIG: Record<RotationSlot, { cadenceDays: number; cooldownDays: number }> = {
  daily_guidance: { cadenceDays: 1, cooldownDays: 45 },
  featured_shabad: { cadenceDays: 3, cooldownDays: 30 },
  topic_spotlight: { cadenceDays: 1, cooldownDays: 21 },
}

const ROTATION_START_STAMP = "2026-01-01"

function stableHash(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function getSavedThemes(savedItemIds: string[]): string[] {
  return savedItemIds
    .map(resolveLearnItem)
    .filter(
      (
        item
      ): item is DailyGuidance | ShabadDeepDive | TopicGuide | Collection => item !== null
    )
    .flatMap(item => {
      if ("rotation" in item) {
        return [item.rotation.theme]
      }
      return item.themes
    })
}

function getLeastRepresentedBalanceCategory(history: RotatingItem[]): string | null {
  const targetCategories = ["comfort", "challenge", "discipline", "gratitude", "hukam", "seva", "reflection"]
  const counts = targetCategories.map(category => ({
    category,
    count: history.filter(item => item.rotation.balanceCategory === category).length,
  }))
  counts.sort((left, right) => left.count - right.count)
  return counts[0]?.category ?? null
}

function getRecentViewsForKinds(
  views: LearnItemView[],
  kinds: LearnContentKind[],
  dayStamp: string,
  maxDays: number
): LearnItemView[] {
  return views.filter(view => {
    if (!kinds.includes(view.kind)) return false
    const viewedDay = view.viewedAt.slice(0, 10)
    return dayDiffLocal(viewedDay, dayStamp) <= maxDays
  })
}

function getPeriodKey(dayStamp: string, slot: RotationSlot): string {
  const config = SLOT_CONFIG[slot]
  const daysSinceStart = dayDiffLocal(ROTATION_START_STAMP, dayStamp)
  const periodIndex = Math.max(0, Math.floor(daysSinceStart / config.cadenceDays))
  return `${slot}:${periodIndex}`
}

function selectItemForPeriod<T extends RotatingItem>(
  items: T[],
  slot: RotationSlot,
  periodStamp: string,
  priorItems: T[],
  savedThemes: string[]
): RotationSelection<T> {
  const needsDeep = priorItems.slice(-6).every(item => item.rotation.depthLevel !== "deep")
  const recentWindow = priorItems.slice(-6)
  const needsBeginner = recentWindow.slice(-2).every(item => item.rotation.depthLevel !== "beginner")
  const leastRepresentedCategory = getLeastRepresentedBalanceCategory(recentWindow)
  const periodKey = getPeriodKey(periodStamp, slot)

  const scored = items
    .map(item => {
      const exactRecentCount = priorItems.filter(previous => previous.id === item.id).length
      const sameThemeCount = recentWindow.filter(previous => previous.rotation.theme === item.rotation.theme).length
      const previousTheme = priorItems.at(-1)?.rotation.theme
      const seenWithinCooldown = priorItems.some(previous => previous.id === item.id)
      const scoreBase = item.rotation.priority * 100 + (stableHash(`${periodKey}:${item.id}`) % 97)
      let score = scoreBase - sameThemeCount * 20 - exactRecentCount * 40

      if (needsDeep && item.rotation.depthLevel === "deep") score += 40
      if (needsBeginner && item.rotation.depthLevel === "beginner") score += 40
      if (leastRepresentedCategory && item.rotation.balanceCategory === leastRepresentedCategory) score += 18
      if (savedThemes.includes(item.rotation.theme)) score += 14
      if (previousTheme === item.rotation.theme) score -= 80
      if (seenWithinCooldown) score -= 100

      return {
        item,
        sameThemeCount,
        score,
        hardPass:
          !priorItems.some(previous => previous.id === item.id)
          && previousTheme !== item.rotation.theme
          && sameThemeCount < 2,
      }
    })
    .sort((left, right) => right.score - left.score)

  const hardMatch = scored.find(candidate => candidate.hardPass)
  if (hardMatch) {
    return {
      item: hardMatch.item,
      reason: `Editorial priority and balance favored ${hardMatch.item.rotation.theme}.`,
      fallbackApplied: false,
      inventoryLimited: false,
    }
  }

  const softerMatch = scored.find(candidate => candidate.sameThemeCount < 2)
  if (softerMatch) {
    return {
      item: softerMatch.item,
      reason: "Fallback widened because the seed pool is smaller than the intended launch inventory.",
      fallbackApplied: true,
      inventoryLimited: true,
    }
  }

  return {
    item: scored[0]!.item,
    reason: "Closest approved item used because the current editorial pool is limited.",
    fallbackApplied: true,
    inventoryLimited: true,
  }
}

function getRotationSelection<T extends RotatingItem>(
  items: T[],
  slot: RotationSlot,
  dayStamp: string,
  savedThemes: string[]
): RotationSelection<T> {
  const config = SLOT_CONFIG[slot]
  const targetDate = parseLocalDayStamp(dayStamp)
  const cursor = parseLocalDayStamp(ROTATION_START_STAMP)
  const selections: Array<{ item: T; dayStamp: string }> = []

  while (cursor <= targetDate) {
    const currentStamp = toLocalDayStamp(cursor)
    const priorItems = selections
      .filter(selection => {
        const diff = dayDiffLocal(selection.dayStamp, currentStamp)
        return diff > 0 && diff <= config.cooldownDays
      })
      .map(selection => selection.item)

    const shouldRotate =
      slot !== "featured_shabad"
      || selections.length === 0
      || dayDiffLocal(selections.at(-1)!.dayStamp, currentStamp) >= config.cadenceDays

    if (shouldRotate) {
      const selection = selectItemForPeriod(items, slot, currentStamp, priorItems, savedThemes)
      selections.push({ item: selection.item, dayStamp: currentStamp })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const todaySelection = selections.at(-1)
  if (!todaySelection) {
    throw new Error(`No selection built for ${slot}`)
  }

  const priorItems = selections
    .filter(selection => {
      const diff = dayDiffLocal(selection.dayStamp, dayStamp)
      return diff > 0 && diff <= config.cooldownDays
    })
    .map(selection => selection.item)

  return selectItemForPeriod(items, slot, dayStamp, priorItems, savedThemes)
}

function scoreTopic(topic: TopicGuide, query: string): number {
  const normalizedTitle = normalizeQuery(topic.title)
  const normalizedShortTitle = normalizeQuery(topic.shortTitle)
  const normalizedTerms = topic.searchTerms.map(normalizeQuery)
  if (normalizedTitle === query || normalizedShortTitle === query) return 100
  if (normalizedTerms.includes(query)) return 96
  if (normalizedTitle.includes(query) || normalizedShortTitle.includes(query)) return 88

  const tokens = query.split(" ")
  return tokens.reduce((score, token) => {
    if (normalizedTitle.includes(token) || normalizedShortTitle.includes(token)) return score + 10
    if (normalizedTerms.some(term => term.includes(token))) return score + 8
    return score
  }, 0)
}

export function resolveLineReference(reference: LearnLineReference): LearnResolvedExcerpt {
  const deepDive = SHABAD_DEEP_DIVE_BY_ID[reference.deepDiveId]
  const lines = deepDive.lines.filter(line => reference.verseIds.includes(line.verseId))

  return {
    deepDive,
    lines,
    shortMeaning: reference.shortMeaning,
    lifeApplication: reference.lifeApplication,
  }
}

export function resolveTopicGuide(query: string): {
  topic: TopicGuide | null
  query: string
  matchedBy: "exact" | "synonym" | "closest" | "empty" | "no-match"
} {
  const normalized = normalizeQuery(query)
  if (!normalized) {
    return { topic: TOPIC_GUIDES[0] ?? null, query: normalized, matchedBy: "empty" }
  }

  const synonymMatch = LEARN_SEARCH_SYNONYMS[normalized]
  if (synonymMatch) {
    return { topic: TOPIC_GUIDE_BY_ID[synonymMatch] ?? null, query: normalized, matchedBy: "synonym" }
  }

  const scored = TOPIC_GUIDES
    .map(topic => ({ topic, score: scoreTopic(topic, normalized) }))
    .sort((left, right) => right.score - left.score)

  const best = scored[0]
  if (!best || best.score <= 0) {
    return { topic: null, query: normalized, matchedBy: "no-match" }
  }

  return {
    topic: best.topic,
    query: normalized,
    matchedBy: best.score >= 96 ? "exact" : "closest",
  }
}

export function getLearnInventorySummary() {
  const dailyGuidance = DAILY_GUIDANCE_ENTRIES.length
  const shabadDeepDives = SHABAD_DEEP_DIVES.length
  const topicGuides = TOPIC_GUIDES.length
  const collections = COLLECTIONS.length
  const crossLinks =
    DAILY_GUIDANCE_ENTRIES.reduce(
      (count, item) =>
        count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length,
      0
    )
    + SHABAD_DEEP_DIVES.reduce(
      (count, item) =>
        count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length,
      0
    )
    + TOPIC_GUIDES.reduce(
      (count, item) =>
        count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length,
      0
    )
    + COLLECTIONS.reduce(
      (count, item) =>
        count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length,
      0
    )

  return {
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    collections,
    crossLinks,
    readyForLaunch:
      dailyGuidance >= LEARN_CONTENT_TARGETS.dailyGuidance
      && shabadDeepDives >= LEARN_CONTENT_TARGETS.shabadDeepDives
      && topicGuides >= LEARN_CONTENT_TARGETS.topicGuides
      && collections >= LEARN_CONTENT_TARGETS.collections
      && crossLinks >= LEARN_CONTENT_TARGETS.crossLinks,
  }
}

export function getTodayLearnSurface(dayStamp: string, learnState: UserLearningState): TodayLearnSurface {
  const dailyGuidance = getRotationSelection(DAILY_GUIDANCE_ENTRIES, "daily_guidance", dayStamp, [])
  const featuredShabad = getRotationSelection(SHABAD_DEEP_DIVES, "featured_shabad", dayStamp, [])
  const topicSpotlight = getRotationSelection(TOPIC_GUIDES, "topic_spotlight", dayStamp, [])

  const themeRail = getThemeRail(dayStamp, learnState)
  const exploreCollections = getExploreCollections(dayStamp, learnState)
  const featuredCollections = exploreCollections.slice(0, 3)
  const continueLearning = getContinueLearningCard(learnState, featuredCollections)

  return {
    dayStamp,
    dailyGuidance,
    featuredShabad,
    topicSpotlight,
    continueLearning,
    themeRail,
    featuredCollections,
    exploreCollections,
    inventory: getLearnInventorySummary(),
  }
}

function getContinueLearningCard(
  learnState: UserLearningState,
  featuredCollections: Collection[]
): ContinueLearningCard {
  if (learnState.activeCollectionId && COLLECTION_BY_ID[learnState.activeCollectionId]) {
    const collection = COLLECTION_BY_ID[learnState.activeCollectionId]
    return {
      kind: "collection",
      title: collection.title,
      body: collection.description,
      collection,
    }
  }

  const mostRecentTopicId = learnState.recentTopicIds[0]
  if (mostRecentTopicId && TOPIC_GUIDE_BY_ID[mostRecentTopicId]) {
    const topic = TOPIC_GUIDE_BY_ID[mostRecentTopicId]
    return {
      kind: "topic",
      title: topic.title,
      body: topic.centralInsight,
      topic,
    }
  }

  const collection =
    featuredCollections[0]
    ?? (learnState.depthPreference === "deep"
      ? COLLECTION_BY_ID["collection-gratitude-and-contentment"]
      : COLLECTION_BY_ID["collection-fear-to-trust"])

  return {
    kind: "collection",
    title: collection.title,
    body: collection.description,
    collection,
  }
}

function getThemeRail(dayStamp: string, learnState: UserLearningState): TopicGuide[] {
  const savedThemes = new Set(getSavedThemes(learnState.savedItemIds))
  const recentTopicIds = new Set(learnState.recentTopicIds)

  return [...TOPIC_GUIDES]
    .sort((left, right) => {
      const leftScore =
        (recentTopicIds.has(left.id) ? 18 : 0)
        + left.searchTerms.filter(term => savedThemes.has(term)).length * 6
        + (savedThemes.has(left.rotation.theme) ? 10 : 0)
        + (left.category === "most-needed" ? 7 : left.category === "practice" ? 3 : 0)
        + (stableHash(`${dayStamp}:topic:${left.id}`) % 23)
      const rightScore =
        (recentTopicIds.has(right.id) ? 18 : 0)
        + right.searchTerms.filter(term => savedThemes.has(term)).length * 6
        + (savedThemes.has(right.rotation.theme) ? 10 : 0)
        + (right.category === "most-needed" ? 7 : right.category === "practice" ? 3 : 0)
        + (stableHash(`${dayStamp}:topic:${right.id}`) % 23)

      return rightScore - leftScore || left.title.localeCompare(right.title)
    })
    .slice(0, 4)
}

function getExploreCollections(dayStamp: string, learnState: UserLearningState): Collection[] {
  const savedThemes = new Set(getSavedThemes(learnState.savedItemIds))
  const recentTopicIds = new Set(learnState.recentTopicIds)

  return [...COLLECTIONS].sort((left, right) => {
    const leftScore =
      left.themes.filter(theme => savedThemes.has(theme)).length * 8
      + left.relatedTopicIds.filter(topicId => recentTopicIds.has(topicId)).length * 10
      + (learnState.activeCollectionId === left.id ? 30 : 0)
      + (left.items.length >= 6 ? 4 : 0)
      + (stableHash(`${dayStamp}:collection:${left.id}`) % 19)
    const rightScore =
      right.themes.filter(theme => savedThemes.has(theme)).length * 8
      + right.relatedTopicIds.filter(topicId => recentTopicIds.has(topicId)).length * 10
      + (learnState.activeCollectionId === right.id ? 30 : 0)
      + (right.items.length >= 6 ? 4 : 0)
      + (stableHash(`${dayStamp}:collection:${right.id}`) % 19)

    return rightScore - leftScore || left.title.localeCompare(right.title)
  })
}

export function filterShabadDeepDives(
  filters: {
    theme?: string
    guru?: string
    raag?: string
    difficulty?: string
    lengthBand?: string
    savedOnly?: boolean
    completedOnly?: boolean
  },
  learnState: UserLearningState
): ShabadDeepDive[] {
  const savedIds = new Set(learnState.savedItemIds)
  const viewedIds = new Set(
    getRecentViewsForKinds(learnState.viewedItems, ["shabad-deep-dive"], toLocalDayStamp(new Date()), 365)
      .map(view => view.itemId)
  )
  const filteredItems = SHABAD_DEEP_DIVES.filter(item => {
    if (filters.theme && !item.themes.includes(filters.theme)) return false
    if (filters.guru && item.citation.guru !== filters.guru) return false
    if (filters.raag && item.citation.raag !== filters.raag) return false
    if (filters.difficulty && item.difficulty !== filters.difficulty) return false
    if (filters.lengthBand && item.lengthBand !== filters.lengthBand) return false
    if (filters.savedOnly && !savedIds.has(item.id)) return false
    if (filters.completedOnly && !viewedIds.has(item.id)) return false
    return true
  })

  if (learnState.depthPreference === "balanced") {
    return filteredItems
  }

  const depthOrder =
    learnState.depthPreference === "gentle"
      ? { beginner: 0, growing: 1, deep: 2 }
      : { deep: 0, growing: 1, beginner: 2 }

  return filteredItems
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const priorityDiff = depthOrder[left.item.difficulty] - depthOrder[right.item.difficulty]
      return priorityDiff || left.index - right.index
    })
    .map(({ item }) => item)
}

export function resolveLearnItem(
  itemId: string
): DailyGuidance | ShabadDeepDive | TopicGuide | Collection | null {
  if (itemId in DAILY_GUIDANCE_BY_ID) return DAILY_GUIDANCE_BY_ID[itemId]
  if (itemId in SHABAD_DEEP_DIVE_BY_ID) return SHABAD_DEEP_DIVE_BY_ID[itemId]
  if (itemId in TOPIC_GUIDE_BY_ID) return TOPIC_GUIDE_BY_ID[itemId]
  if (itemId in COLLECTION_BY_ID) return COLLECTION_BY_ID[itemId]
  return null
}

export function getLearnSavedItems(savedItemIds: string[]): LearnSavedItem[] {
  return savedItemIds
    .map(itemId => {
      const kind = getLearnItemKind(itemId)
      if (!kind) return null

      if (kind === "daily-guidance") {
        const item = DAILY_GUIDANCE_BY_ID[itemId]
        if (!item) return null
        return {
          id: item.id,
          kind,
          title: item.title,
          subtitle: item.title,
          detail: item.summary,
          theme: item.rotation.theme,
        } satisfies LearnSavedItem
      }

      if (kind === "topic-guide") {
        const item = TOPIC_GUIDE_BY_ID[itemId]
        if (!item) return null
        return {
          id: item.id,
          kind,
          title: item.title,
          subtitle: item.shortTitle,
          detail: item.centralInsight,
          theme: item.rotation.theme,
        } satisfies LearnSavedItem
      }

      if (kind === "shabad-deep-dive") {
        const item = SHABAD_DEEP_DIVE_BY_ID[itemId]
        if (!item) return null
        return {
          id: item.id,
          kind,
          title: item.title,
          subtitle: item.subtitle,
          detail: item.summary,
          theme: item.rotation.theme,
        } satisfies LearnSavedItem
      }

      const item = COLLECTION_BY_ID[itemId]
      if (!item) return null
      return {
        id: item.id,
        kind,
        title: item.title,
        subtitle: item.subtitle,
        detail: item.description,
        theme: item.themes[0] ?? "study",
      } satisfies LearnSavedItem
    })
    .filter((item): item is LearnSavedItem => Boolean(item))
}

export function getLearnItemLabel(kind: LearnContentKind): string {
  switch (kind) {
    case "daily-guidance":
      return "Daily guidance"
    case "shabad-deep-dive":
      return "Shabad deep dive"
    case "topic-guide":
      return "Topic guide"
    case "collection":
      return "Journey"
    default:
      return "Item"
  }
}
