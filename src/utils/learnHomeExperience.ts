import type {
  LearnContentKind,
  LearnHomeCatalog,
  LearnHomeCollection,
  LearnHomeDailyGuidance,
  LearnHomeShabadDeepDive,
  LearnHomeTopicGuide,
  UserLearningState,
} from "../types"
import type { LearnSavedItem } from "./learnExperience"
import { dayDiffLocal, parseLocalDayStamp, toLocalDayStamp } from "./learnDates"

type RotationSlot = "daily_guidance" | "featured_shabad"

type RotatingItem = LearnHomeDailyGuidance | LearnHomeShabadDeepDive

type RotationSelection<T extends RotatingItem> = {
  item: T
  reason: string
  fallbackApplied: boolean
  inventoryLimited: boolean
}

export type HomeContinueLearningCard =
  | {
      kind: "collection"
      collection: LearnHomeCollection
    }
  | {
      kind: "topic"
      topic: LearnHomeTopicGuide
    }

export type TodayLearnHomeSurface = {
  dayStamp: string
  dailyGuidance: RotationSelection<LearnHomeDailyGuidance>
  featuredShabad: RotationSelection<LearnHomeShabadDeepDive>
  continueLearning: HomeContinueLearningCard
}

const SLOT_CONFIG: Record<RotationSlot, { cadenceDays: number; cooldownDays: number }> = {
  daily_guidance: { cadenceDays: 1, cooldownDays: 45 },
  featured_shabad: { cadenceDays: 3, cooldownDays: 30 },
}

const ROTATION_START_STAMP = "2026-01-01"

function stableHash(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function getSavedThemes(learnCatalog: LearnHomeCatalog, savedItemIds: string[]): string[] {
  return savedItemIds
    .map(itemId => resolveLearnHomeItem(learnCatalog, itemId))
    .filter(
      (
        item
      ): item is LearnHomeDailyGuidance | LearnHomeShabadDeepDive | LearnHomeTopicGuide | LearnHomeCollection =>
        item !== null
    )
    .flatMap(item => {
      if ("rotation" in item) {
        if ("themes" in item) return item.themes
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
  priorItems: T[]
): RotationSelection<T> {
  const needsDeep = priorItems.slice(-6).every(item => item.rotation.depthLevel !== "deep")
  const needsBeginner = priorItems.slice(-2).every(item => item.rotation.depthLevel !== "beginner")
  const leastRepresentedCategory = getLeastRepresentedBalanceCategory(priorItems.slice(-6))
  const previousTheme = priorItems.at(-1)?.rotation.theme
  const periodKey = getPeriodKey(periodStamp, slot)

  const scored = items
    .map(item => {
      const exactRecentCount = priorItems.filter(previous => previous.id === item.id).length
      const sameThemeCount = priorItems
        .slice(-6)
        .filter(previous => previous.rotation.theme === item.rotation.theme).length
      const seenWithinCooldown = priorItems.some(previous => previous.id === item.id)
      const scoreBase = item.rotation.priority * 100 + (stableHash(`${periodKey}:${item.id}`) % 97)
      let score = scoreBase - sameThemeCount * 20 - exactRecentCount * 40

      if (needsDeep && item.rotation.depthLevel === "deep") score += 40
      if (needsBeginner && item.rotation.depthLevel === "beginner") score += 40
      if (leastRepresentedCategory && item.rotation.balanceCategory === leastRepresentedCategory) score += 18
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
  dayStamp: string
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
      const selection = selectItemForPeriod(items, slot, currentStamp, priorItems)
      selections.push({ selection, dayStamp: currentStamp })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return selections.at(-1)!.selection
}

function getExploreCollections(
  learnCatalog: LearnHomeCatalog,
  dayStamp: string,
  learnState: UserLearningState
): LearnHomeCollection[] {
  const savedThemes = new Set(getSavedThemes(learnCatalog, learnState.savedItemIds))
  const recentTopicIds = new Set(learnState.recentTopicIds)

  return [...learnCatalog.collections]
    .sort((left, right) => {
      const leftScore =
        left.themes.filter(theme => savedThemes.has(theme)).length * 8
        + left.relatedTopicIds.filter(topicId => recentTopicIds.has(topicId)).length * 10
        + (learnState.activeCollectionId === left.id ? 30 : 0)
        + (left.itemCount >= 6 ? 4 : 0)
        + (stableHash(`${dayStamp}:collection:${left.id}`) % 19)
      const rightScore =
        right.themes.filter(theme => savedThemes.has(theme)).length * 8
        + right.relatedTopicIds.filter(topicId => recentTopicIds.has(topicId)).length * 10
        + (learnState.activeCollectionId === right.id ? 30 : 0)
        + (right.itemCount >= 6 ? 4 : 0)
        + (stableHash(`${dayStamp}:collection:${right.id}`) % 19)

      return rightScore - leftScore || left.title.localeCompare(right.title)
    })
    .slice(0, 6)
}

function getContinueLearningCard(
  learnCatalog: LearnHomeCatalog,
  dayStamp: string,
  learnState: UserLearningState
): HomeContinueLearningCard {
  if (learnState.activeCollectionId && learnCatalog.collectionById[learnState.activeCollectionId]) {
    return {
      kind: "collection",
      collection: learnCatalog.collectionById[learnState.activeCollectionId],
    }
  }

  const mostRecentTopicId = learnState.recentTopicIds[0]
  if (mostRecentTopicId && learnCatalog.topicGuideById[mostRecentTopicId]) {
    return {
      kind: "topic",
      topic: learnCatalog.topicGuideById[mostRecentTopicId],
    }
  }

  const featuredCollections = getExploreCollections(learnCatalog, dayStamp, learnState)
  const collection =
    featuredCollections[0]
    ?? (learnState.depthPreference === "deep"
      ? learnCatalog.collectionById["collection-gratitude-and-contentment"]
      : learnCatalog.collectionById["collection-fear-to-trust"])

  return {
    kind: "collection",
    collection,
  }
}

function getLearnHomeItemKind(learnCatalog: LearnHomeCatalog, itemId: string): LearnContentKind | null {
  if (itemId in learnCatalog.dailyGuidanceById) return "daily-guidance"
  if (itemId in learnCatalog.shabadDeepDiveById) return "shabad-deep-dive"
  if (itemId in learnCatalog.topicGuideById) return "topic-guide"
  if (itemId in learnCatalog.collectionById) return "collection"
  return null
}

function resolveLearnHomeItem(
  learnCatalog: LearnHomeCatalog,
  itemId: string
): LearnHomeDailyGuidance | LearnHomeShabadDeepDive | LearnHomeTopicGuide | LearnHomeCollection | null {
  if (itemId in learnCatalog.dailyGuidanceById) return learnCatalog.dailyGuidanceById[itemId]
  if (itemId in learnCatalog.shabadDeepDiveById) return learnCatalog.shabadDeepDiveById[itemId]
  if (itemId in learnCatalog.topicGuideById) return learnCatalog.topicGuideById[itemId]
  if (itemId in learnCatalog.collectionById) return learnCatalog.collectionById[itemId]
  return null
}

export function getTodayLearnHomeSurface(
  learnCatalog: LearnHomeCatalog,
  dayStamp: string,
  learnState: UserLearningState
): TodayLearnHomeSurface {
  return {
    dayStamp,
    dailyGuidance: getRotationSelection(learnCatalog.dailyGuidance, "daily_guidance", dayStamp),
    featuredShabad: getRotationSelection(learnCatalog.shabadDeepDives, "featured_shabad", dayStamp),
    continueLearning: getContinueLearningCard(learnCatalog, dayStamp, learnState),
  }
}

export function getLearnHomeSavedItems(learnCatalog: LearnHomeCatalog, savedItemIds: string[]): LearnSavedItem[] {
  return savedItemIds
    .map(itemId => {
      const kind = getLearnHomeItemKind(learnCatalog, itemId)
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
