import type {
  Collection,
  DailyGuidance,
  LearnCatalog,
  LearnContentKind,
  LearnManifest,
  LearnSearchIndex,
  LearnValidationReport,
  ShabadDeepDive,
  TopicGuide,
} from "../types"

type LearnJsonLoader = <T>(path: string) => Promise<T>

type LearnDetailMap = {
  "daily-guidance": DailyGuidance
  "shabad-deep-dive": ShabadDeepDive
  "topic-guide": TopicGuide
  collection: Collection
}

const DEFAULT_MANIFEST_PATH = "/data/learn/manifest.json"

function createIndexMap<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map(item => [item.id, item] as const)) as Record<string, T>
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
const detailPromises = new Map<string, Promise<DailyGuidance | ShabadDeepDive | TopicGuide | Collection>>()

export function configureLearnRepositoryLoader(loader: LearnJsonLoader | null) {
  jsonLoader = loader ?? defaultFetchJson
  resetLearnRepositoryCache()
}

export function resetLearnRepositoryCache() {
  manifestPromise = null
  searchIndexPromise = null
  catalogPromise = null
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
    catalogPromise = Promise.all([
      loadLearnManifest(),
      loadLearnSearchIndex(),
    ]).then(async ([manifest, searchIndex]) => {
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
    const promise = (async () => {
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
    })()

    detailPromises.set(key, promise as Promise<DailyGuidance | ShabadDeepDive | TopicGuide | Collection>)
  }

  try {
    return await detailPromises.get(key)! as LearnDetailMap[K]
  } catch (error) {
    detailPromises.delete(key)
    if (error instanceof Error && /404/.test(error.message)) {
      return null
    }
    throw error
  }
}
