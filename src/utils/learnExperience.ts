import { LEARN_CONTENT_TARGETS } from "../data/learnTargets"
import type {
  Collection,
  DailyGuidance,
  LearnCatalog,
  LearnContentKind,
  LearnItemView,
  LearnLineReference,
  ShabadDeepDive,
  TopicScenarioKey,
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

type LearnCatalogData = Pick<
  LearnCatalog,
  | "collections"
  | "collectionById"
  | "dailyGuidance"
  | "dailyGuidanceById"
  | "manifest"
  | "searchIndex"
  | "shabadDeepDiveById"
  | "shabadDeepDives"
  | "topicGuideById"
  | "topicGuides"
>

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

function getSavedThemes(learnCatalog: LearnCatalogData, savedItemIds: string[]): string[] {
  return savedItemIds
    .map(itemId => resolveLearnItem(learnCatalog, itemId))
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
  const selections: Array<{ selection: RotationSelection<T>; dayStamp: string }> = []

  while (cursor <= targetDate) {
    const currentStamp = toLocalDayStamp(cursor)
    const priorItems = selections
      .filter(selection => {
        const diff = dayDiffLocal(selection.dayStamp, currentStamp)
        return diff > 0 && diff <= config.cooldownDays
      })
      .map(selection => selection.selection.item)

    const shouldRotate =
      slot !== "featured_shabad"
      || selections.length === 0
      || dayDiffLocal(selections.at(-1)!.dayStamp, currentStamp) >= config.cadenceDays

    if (shouldRotate) {
      const selection = selectItemForPeriod(items, slot, currentStamp, priorItems, savedThemes)
      selections.push({ selection, dayStamp: currentStamp })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const todaySelection = selections.at(-1)
  if (!todaySelection) {
    throw new Error(`No selection built for ${slot}`)
  }
  return todaySelection.selection
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

export function resolveLineReference(
  learnCatalog: LearnCatalogData,
  reference: LearnLineReference
): LearnResolvedExcerpt {
  const deepDive = learnCatalog.shabadDeepDiveById[reference.deepDiveId]
  const lines = deepDive.lines.filter(line => reference.verseIds.includes(line.verseId))

  return {
    deepDive,
    lines,
    shortMeaning: reference.shortMeaning,
    lifeApplication: reference.lifeApplication,
  }
}

export function resolveTopicGuide(learnCatalog: LearnCatalogData, query: string): {
  topic: TopicGuide | null
  query: string
  matchedBy: "exact" | "synonym" | "closest" | "empty" | "no-match"
  scenarioKey: Exclude<TopicScenarioKey, "overview"> | null
} {
  const normalized = normalizeQuery(query)
  if (!normalized) {
    return { topic: learnCatalog.topicGuides[0] ?? null, query: normalized, matchedBy: "empty", scenarioKey: null }
  }

  const synonymMatch = learnCatalog.searchIndex.synonyms[normalized]
  if (synonymMatch) {
    return {
      topic: learnCatalog.topicGuideById[synonymMatch.topicId] ?? null,
      query: normalized,
      matchedBy: "synonym",
      scenarioKey: synonymMatch.scenarioKey ?? null,
    }
  }

  const scored = learnCatalog.topicGuides
    .map(topic => ({ topic, score: scoreTopic(topic, normalized) }))
    .sort((left, right) => right.score - left.score)

  const best = scored[0]
  if (!best || best.score <= 0) {
    return { topic: null, query: normalized, matchedBy: "no-match", scenarioKey: null }
  }

  return {
    topic: best.topic,
    query: normalized,
    matchedBy: best.score >= 96 ? "exact" : "closest",
    scenarioKey: null,
  }
}

export function getLearnInventorySummary(learnCatalog: LearnCatalogData) {
  const dailyGuidance = learnCatalog.dailyGuidance.length
  const shabadDeepDives = learnCatalog.shabadDeepDives.length
  const topicGuides = learnCatalog.topicGuides.length
  const topicScenarios = learnCatalog.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0)
  const collections = learnCatalog.collections.length
  const crossLinks =
    learnCatalog.dailyGuidance.reduce(
      (count, item) =>
        count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length,
      0
    )
    + learnCatalog.shabadDeepDives.reduce(
      (count, item) =>
        count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length,
      0
    )
    + learnCatalog.topicGuides.reduce(
      (count, item) =>
        count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length,
      0
    )
    + learnCatalog.topicGuides.reduce(
      (count, item) =>
        count + item.scenarioOrder.reduce(
          (scenarioCount, scenarioKey) => scenarioCount + item.scenarios[scenarioKey].excerpts.length + 1,
          0
        ),
      0
    )
    + learnCatalog.collections.reduce(
      (count, item) =>
        count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length,
      0
    )

  return {
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    topicScenarios,
    collections,
    crossLinks,
    readyForLaunch:
      dailyGuidance >= LEARN_CONTENT_TARGETS.dailyGuidance
      && shabadDeepDives >= LEARN_CONTENT_TARGETS.shabadDeepDives
      && topicGuides >= LEARN_CONTENT_TARGETS.topicGuides
      && topicScenarios >= LEARN_CONTENT_TARGETS.topicScenarios
      && collections >= LEARN_CONTENT_TARGETS.collections
      && crossLinks >= LEARN_CONTENT_TARGETS.crossLinks
      && crossLinks / Math.max(1, dailyGuidance + shabadDeepDives + topicGuides + topicScenarios + collections)
        >= LEARN_CONTENT_TARGETS.averageCrossLinksPerItem,
  }
}

export function getTodayLearnSurface(
  learnCatalog: LearnCatalogData,
  dayStamp: string,
  learnState: UserLearningState
): TodayLearnSurface {
  const dailyGuidance = getRotationSelection(learnCatalog.dailyGuidance, "daily_guidance", dayStamp, [])
  const featuredShabad = getRotationSelection(learnCatalog.shabadDeepDives, "featured_shabad", dayStamp, [])
  const topicSpotlight = getRotationSelection(learnCatalog.topicGuides, "topic_spotlight", dayStamp, [])
  const themeRail = getThemeRail(learnCatalog, dayStamp, learnState, {
    excludedTopicIds: new Set([topicSpotlight.item.id]),
    excludedThemes: new Set([topicSpotlight.item.rotation.theme]),
  })
  const exploreCollections = getExploreCollections(learnCatalog, dayStamp, learnState)
  const featuredCollections = exploreCollections.slice(0, 3)
  const continueLearning = getContinueLearningCard(learnCatalog, learnState, featuredCollections)

  return {
    dayStamp,
    dailyGuidance,
    featuredShabad,
    topicSpotlight,
    continueLearning,
    themeRail,
    featuredCollections,
    exploreCollections,
    inventory: getLearnInventorySummary(learnCatalog),
  }
}

function getContinueLearningCard(
  learnCatalog: LearnCatalogData,
  learnState: UserLearningState,
  featuredCollections: Collection[]
): ContinueLearningCard {
  if (learnState.activeCollectionId && learnCatalog.collectionById[learnState.activeCollectionId]) {
    const collection = learnCatalog.collectionById[learnState.activeCollectionId]
    return {
      kind: "collection",
      title: collection.title,
      body: collection.description,
      collection,
    }
  }

  const mostRecentTopicId = learnState.recentTopicIds[0]
  if (mostRecentTopicId && learnCatalog.topicGuideById[mostRecentTopicId]) {
    const topic = learnCatalog.topicGuideById[mostRecentTopicId]
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
      ? learnCatalog.collectionById["collection-gratitude-and-contentment"]
      : learnCatalog.collectionById["collection-fear-to-trust"])

  return {
    kind: "collection",
    title: collection.title,
    body: collection.description,
    collection,
  }
}

function getThemeRail(
  learnCatalog: LearnCatalogData,
  dayStamp: string,
  learnState: UserLearningState,
  options?: {
    excludedTopicIds?: Set<string>
    excludedThemes?: Set<string>
  }
): TopicGuide[] {
  const savedThemes = new Set(getSavedThemes(learnCatalog, learnState.savedItemIds))
  const recentTopicIds = new Set(learnState.recentTopicIds)
  const excludedTopicIds = options?.excludedTopicIds ?? new Set<string>()
  const excludedThemes = options?.excludedThemes ?? new Set<string>()

  return [...learnCatalog.topicGuides]
    .filter(topic => !excludedTopicIds.has(topic.id) && !excludedThemes.has(topic.rotation.theme))
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

function getExploreCollections(
  learnCatalog: LearnCatalogData,
  dayStamp: string,
  learnState: UserLearningState
): Collection[] {
  const savedThemes = new Set(getSavedThemes(learnCatalog, learnState.savedItemIds))
  const recentTopicIds = new Set(learnState.recentTopicIds)

  return [...learnCatalog.collections].sort((left, right) => {
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
  }).slice(0, 6)
}

export function filterShabadDeepDives(
  learnCatalog: LearnCatalogData,
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
  const filteredItems = learnCatalog.shabadDeepDives.filter(item => {
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
  const deepBalanceOrder: Record<string, number> = {
    reflection: 0,
    challenge: 1,
    discipline: 2,
    hukam: 3,
    seva: 4,
    gratitude: 5,
    comfort: 6,
  }

  return filteredItems
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const priorityDiff = depthOrder[left.item.difficulty] - depthOrder[right.item.difficulty]
      if (priorityDiff) return priorityDiff

      if (learnState.depthPreference === "deep" && left.item.difficulty === "deep" && right.item.difficulty === "deep") {
        const balanceDiff =
          (deepBalanceOrder[left.item.rotation.balanceCategory] ?? 99)
          - (deepBalanceOrder[right.item.rotation.balanceCategory] ?? 99)
        if (balanceDiff) return balanceDiff
      }

      return left.index - right.index
    })
    .map(({ item }) => item)
}

export function getLearnItemKind(learnCatalog: LearnCatalogData, itemId: string): LearnContentKind | null {
  if (itemId in learnCatalog.dailyGuidanceById) return "daily-guidance"
  if (itemId in learnCatalog.shabadDeepDiveById) return "shabad-deep-dive"
  if (itemId in learnCatalog.topicGuideById) return "topic-guide"
  if (itemId in learnCatalog.collectionById) return "collection"
  return null
}

export function resolveLearnItem(
  learnCatalog: LearnCatalogData,
  itemId: string
): DailyGuidance | ShabadDeepDive | TopicGuide | Collection | null {
  if (itemId in learnCatalog.dailyGuidanceById) return learnCatalog.dailyGuidanceById[itemId]
  if (itemId in learnCatalog.shabadDeepDiveById) return learnCatalog.shabadDeepDiveById[itemId]
  if (itemId in learnCatalog.topicGuideById) return learnCatalog.topicGuideById[itemId]
  if (itemId in learnCatalog.collectionById) return learnCatalog.collectionById[itemId]
  return null
}

export function getLearnSavedItems(learnCatalog: LearnCatalogData, savedItemIds: string[]): LearnSavedItem[] {
  return savedItemIds
    .map(itemId => {
      const kind = getLearnItemKind(learnCatalog, itemId)
      if (!kind) return null

      if (kind === "daily-guidance") {
        const item = learnCatalog.dailyGuidanceById[itemId]
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
        const item = learnCatalog.topicGuideById[itemId]
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
        const item = learnCatalog.shabadDeepDiveById[itemId]
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

      const item = learnCatalog.collectionById[itemId]
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
