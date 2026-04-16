import type {
  Collection,
  DailyGuidance,
  LearnCatalog,
  LearnHomeCatalog,
  LearnHomeCatalogPayload,
  LearnContentKind,
  LearnManifest,
  LearnSearchIndex,
  LearnValidationReport,
  ShabadDeepDive,
  TopicGuide,
} from "../types"
import { withQaControl } from "../qa/runtime"

type LearnJsonLoader = <T>(path: string) => Promise<T>

type LearnDetailMap = {
  "daily-guidance": DailyGuidance
  "shabad-deep-dive": ShabadDeepDive
  "topic-guide": TopicGuide
  collection: Collection
}

const DEFAULT_MANIFEST_PATH = "/data/learn/manifest.json"
const DEFAULT_HOME_SUMMARY_PATH = "/data/learn/home-summary.json"

function createIndexMap<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map(item => [item.id, item] as const)) as Record<string, T>
}

function buildLearnHomeCatalog(summary: LearnHomeCatalogPayload): LearnHomeCatalog {
  return {
    ...summary,
    dailyGuidanceById: createIndexMap(summary.dailyGuidance),
    shabadDeepDiveById: createIndexMap(summary.shabadDeepDives),
    topicGuideById: createIndexMap(summary.topicGuides),
    collectionById: createIndexMap(summary.collections),
  }
}

async function defaultFetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Learn repository request failed for ${path}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

let jsonLoader: LearnJsonLoader = defaultFetchJson
let manifestPromise: Promise<LearnManifest> | null = null
let searchIndexPromise: Promise<LearnSearchIndex> | null = null
let catalogPromise: Promise<LearnCatalog> | null = null
let homeCatalogPromise: Promise<LearnHomeCatalog> | null = null
const detailPromises = new Map<string, Promise<DailyGuidance | ShabadDeepDive | TopicGuide | Collection>>()

export function configureLearnRepositoryLoader(loader: LearnJsonLoader | null) {
  jsonLoader = loader ?? defaultFetchJson
  resetLearnRepositoryCache()
}

export function resetLearnRepositoryCache() {
  manifestPromise = null
  searchIndexPromise = null
  catalogPromise = null
  homeCatalogPromise = null
  detailPromises.clear()
}

export async function loadLearnManifest() {
  if (!manifestPromise) {
    manifestPromise = jsonLoader<LearnManifest>(DEFAULT_MANIFEST_PATH)
  }
  return manifestPromise
}

export async function loadLearnSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = loadLearnManifest()
      .then(manifest => jsonLoader<LearnSearchIndex>(manifest.searchIndexPath))
  }
  return searchIndexPromise
}

export async function loadLearnCatalog() {
  if (!catalogPromise) {
    catalogPromise = withQaControl('learn-catalog', async () => {
      const [manifest, searchIndex] = await Promise.all([
        loadLearnManifest(),
        loadLearnSearchIndex(),
      ])

      const [dailyGuidance, shabadDeepDives, topicGuides, collections] = await Promise.all([
        jsonLoader<DailyGuidance[]>(manifest.listPaths.dailyGuidance),
        jsonLoader<ShabadDeepDive[]>(manifest.listPaths.shabadDeepDives),
        jsonLoader<TopicGuide[]>(manifest.listPaths.topicGuides),
        jsonLoader<Collection[]>(manifest.listPaths.collections),
      ])

      return {
        manifest,
        searchIndex,
        dailyGuidance,
        shabadDeepDives,
        topicGuides,
        collections,
        dailyGuidanceById: createIndexMap(dailyGuidance),
        shabadDeepDiveById: createIndexMap(shabadDeepDives),
        topicGuideById: createIndexMap(topicGuides),
        collectionById: createIndexMap(collections),
      } satisfies LearnCatalog
    })
  }

  return catalogPromise
}

export async function loadLearnHomeCatalog() {
  if (!homeCatalogPromise) {
    homeCatalogPromise = withQaControl('learn-catalog', async () => {
      try {
        const summary = await jsonLoader<LearnHomeCatalogPayload>(DEFAULT_HOME_SUMMARY_PATH)
        return buildLearnHomeCatalog(summary)
      } catch (error) {
        if (
          !(error instanceof Error)
          || !/404|ENOENT|no such file/i.test(error.message)
        ) {
          throw error
        }

        const catalog = await loadLearnCatalog()
        return buildLearnHomeCatalog({
          dailyGuidance: catalog.dailyGuidance.map(item => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            relatedTopicIds: item.relatedTopicIds,
            relatedShabadIds: item.relatedShabadIds,
            relatedCollectionIds: item.relatedCollectionIds,
            rotation: item.rotation,
          })),
          shabadDeepDives: catalog.shabadDeepDives.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            summary: item.summary,
            whyItMatters: item.whyItMatters,
            themes: item.themes,
            relatedGuidanceIds: item.relatedGuidanceIds,
            relatedTopicIds: item.relatedTopicIds,
            relatedCollectionIds: item.relatedCollectionIds,
            rotation: item.rotation,
          })),
          topicGuides: catalog.topicGuides.map(item => ({
            id: item.id,
            title: item.title,
            shortTitle: item.shortTitle,
            category: item.category,
            centralInsight: item.centralInsight,
            searchTerms: item.searchTerms,
            relatedTopicIds: item.relatedTopicIds,
            relatedShabadIds: item.relatedShabadIds,
            relatedCollectionIds: item.relatedCollectionIds,
            rotation: item.rotation,
          })),
          collections: catalog.collections.map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            durationLabel: item.durationLabel,
            themes: item.themes,
            relatedTopicIds: item.relatedTopicIds,
            relatedShabadIds: item.relatedShabadIds,
            itemCount: item.items.length,
          })),
        })
      }
    })
  }

  return homeCatalogPromise
}

function buildDetailPath(manifest: LearnManifest, kind: LearnContentKind, id: string) {
  return manifest.detailPathTemplate[kind].replace(":id", id)
}

export async function loadLearnValidationReport() {
  const manifest = await loadLearnManifest()
  return jsonLoader<LearnValidationReport>(manifest.validationReportPath)
}

export async function loadLearnDetail<K extends LearnContentKind>(
  kind: K,
  id: string
): Promise<LearnDetailMap[K] | null> {
  const key = `${kind}:${id}`
  if (!detailPromises.has(key)) {
    const promise = withQaControl('learn-detail', async () => {
      const catalog = await loadLearnCatalog()

      if (kind === "daily-guidance" && catalog.dailyGuidanceById[id]) {
        return catalog.dailyGuidanceById[id]
      }
      if (kind === "topic-guide" && catalog.topicGuideById[id]) {
        return catalog.topicGuideById[id]
      }
      if (kind === "collection" && catalog.collectionById[id]) {
        return catalog.collectionById[id]
      }

      const detailPath = buildDetailPath(catalog.manifest, kind, id)
      return jsonLoader<LearnDetailMap[K]>(detailPath)
    }, {
      emptyValue: null,
    })

    detailPromises.set(key, promise as Promise<DailyGuidance | ShabadDeepDive | TopicGuide | Collection>)
  }

  try {
    return await detailPromises.get(key)! as LearnDetailMap[K]
  } catch (error) {
    detailPromises.delete(key)
    if (
      error instanceof Error
      && (
        /404/.test(error.message)
        || /ENOENT/.test(error.message)
        || /no such file/i.test(error.message)
      )
    ) {
      return null
    }
    throw error
  }
}
