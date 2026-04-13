import fs from "node:fs/promises"
import path from "node:path"
import {
  EDITS_DIR,
  KIND_ORDER,
  REVIEW_STATE_PATH,
  SNAPSHOT_DIR,
  flattenReviewItems,
  loadArchiveDataset,
  loadOverrideRecord,
  loadReviewState,
  pathExists,
  saveReviewState,
  serializeOverrideModule,
  writeText,
} from "./review-helpers.mjs"

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    reviewer: process.env.USER ?? "codex",
    batchTag: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--dry-run") {
      flags.dryRun = true
    } else if (value === "--reviewer") {
      flags.reviewer = argv[index + 1] ?? flags.reviewer
      index += 1
    } else if (value === "--batch") {
      flags.batchTag = argv[index + 1] ?? null
      index += 1
    }
  }

  return flags
}

function parseJsonCompatibleYaml(raw, sourceLabel) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Failed to parse ${sourceLabel} as JSON-compatible YAML. Keep the fenced block in JSON form. ${error.message}`)
  }

  assertNoProtectedScriptureFields(parsed, sourceLabel)
  return parsed
}

const PROTECTED_SCRIPTURE_FIELDS = new Set([
  "ang",
  "citation",
  "gurmukhi",
  "line_range",
  "lines",
  "scripture",
  "shabadid",
  "shabad_id",
  "transliteration",
  "translation",
  "translation_en",
  "translation_hi",
  "translation_pa",
  "translations_en",
  "verseid",
  "verseids",
  "verse_id",
  "verse_ids",
])

function assertNoProtectedScriptureFields(value, sourceLabel, trail = []) {
  if (!value || typeof value !== "object") {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertNoProtectedScriptureFields(entry, sourceLabel, [...trail, `[${index}]`])
    })
    return
  }

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.replace(/[^a-z0-9_]/gi, "").toLowerCase()
    if (PROTECTED_SCRIPTURE_FIELDS.has(normalizedKey)) {
      const fieldPath = [...trail, key].join(".")
      throw new Error(
        `${sourceLabel} tries to edit protected scripture field "${fieldPath}". Review payloads may change editorial wrapper copy only.`
      )
    }
    assertNoProtectedScriptureFields(nested, sourceLabel, [...trail, key])
  }
}

function collectSnapshotEdits(content) {
  const pattern = /<!-- REVIEW-(?:ENTRY|LINKED): ([^ ]+) ([^\s]+) -->[\s\S]*?```yaml\n([\s\S]*?)\n```/g
  const matches = []

  for (const match of content.matchAll(pattern)) {
    matches.push({
      kind: match[1],
      id: match[2],
      payload: parseJsonCompatibleYaml(match[3], `snapshot entry ${match[1]} ${match[2]}`),
    })
  }

  return matches
}

async function collectEditsFromSnapshots() {
  const edits = []
  for (const kind of KIND_ORDER) {
    const snapshotPath = path.join(SNAPSHOT_DIR, `${kind}.md`)
    if (!(await pathExists(snapshotPath))) continue
    const content = await fs.readFile(snapshotPath, "utf8")
    edits.push(...collectSnapshotEdits(content))
  }
  return edits
}

async function collectEditsFromYamlFiles() {
  const edits = []

  for (const kind of KIND_ORDER) {
    const kindDir = path.join(EDITS_DIR, kind)
    if (!(await pathExists(kindDir))) continue
    const entries = await fs.readdir(kindDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(ya?ml|json)$/i.test(entry.name)) continue
      const id = entry.name.replace(/\.(ya?ml|json)$/i, "")
      const raw = await fs.readFile(path.join(kindDir, entry.name), "utf8")
      edits.push({
        kind,
        id,
        payload: parseJsonCompatibleYaml(raw, `${kind}/${entry.name}`),
      })
    }
  }

  return edits
}

function uniqueEdits(edits) {
  const merged = new Map()
  for (const edit of edits) {
    merged.set(`${edit.kind}:${edit.id}`, edit)
  }
  return Array.from(merged.values())
}

function getEditablePayload(kind, item) {
  if (kind === "daily-guidance") {
    return {
      title: item.title,
      rotationTheme: item.rotation?.theme ?? "",
      summary: item.summary,
      takeaway: item.takeaway,
      lifeApplication: item.lifeApplication,
      source: {
        shortMeaning: item.source.shortMeaning,
        lifeApplication: item.source.lifeApplication,
      },
    }
  }

  if (kind === "shabad-deep-dive") {
    return {
      title: item.title,
      summary: item.summary,
      whyItMatters: item.whyItMatters,
      takeaway: item.takeaway,
      structure: item.structure,
    }
  }

  if (kind === "topic-guide") {
    return {
      title: item.title,
      shortTitle: item.shortTitle,
      issueStatement: item.issueStatement,
      centralInsight: item.centralInsight,
      practicalReflection: item.practicalReflection,
      actionPrompt: item.actionPrompt,
      excerpts: item.excerpts.map(excerpt => ({
        source: {
          shortMeaning: excerpt.source.shortMeaning,
          lifeApplication: excerpt.source.lifeApplication,
        },
        explanation: excerpt.explanation,
      })),
    }
  }

  if (kind === "topic-scenario") {
    return {
      title: item.title,
      issueStatement: item.issueStatement,
      centralInsight: item.centralInsight,
      practicalReflection: item.practicalReflection,
      actionPrompt: item.actionPrompt,
      excerpts: item.excerpts.map(excerpt => ({
        source: {
          shortMeaning: excerpt.source.shortMeaning,
          lifeApplication: excerpt.source.lifeApplication,
        },
        explanation: excerpt.explanation,
      })),
    }
  }

  return {
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    heroSource: {
      shortMeaning: item.heroSource.shortMeaning,
      lifeApplication: item.heroSource.lifeApplication,
    },
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const { dataset } = await loadArchiveDataset({ preferDrafts: true })
  const currentPayloads = new Map(
    flattenReviewItems(dataset).map(({ kind, id, item }) => [`${kind}:${id}`, JSON.stringify(getEditablePayload(kind, item))])
  )
  const edits = uniqueEdits([
    ...(await collectEditsFromSnapshots()),
    ...(await collectEditsFromYamlFiles()),
  ]).filter(edit => JSON.stringify(edit.payload) !== currentPayloads.get(`${edit.kind}:${edit.id}`))

  if (edits.length === 0) {
    console.log("No edited snapshot blocks or per-item YAML files found.")
    return
  }

  const reviewState = await loadReviewState()
  const groupedByKind = Object.fromEntries(KIND_ORDER.map(kind => [kind, []]))
  for (const edit of edits) {
    groupedByKind[edit.kind].push(edit)
  }

  const summaries = []

  for (const kind of KIND_ORDER) {
    if (groupedByKind[kind].length === 0) continue

    const moduleInfo = loadOverrideRecord(kind)
    const nextRecord = { ...moduleInfo.record }

    for (const edit of groupedByKind[kind]) {
      nextRecord[edit.id] = {
        ...(nextRecord[edit.id] ?? {}),
        ...edit.payload,
        reviewedByHuman: true,
      }

      reviewState.items[kind][edit.id] = {
        reviewer: flags.reviewer,
        status: "approved",
        reviewedAt: new Date().toISOString(),
        batchTag: flags.batchTag,
        notes: `Applied from snapshot tooling on ${new Date().toISOString()}`,
      }
    }

    const moduleText = serializeOverrideModule(kind, Object.fromEntries(
      Object.entries(nextRecord).sort(([left], [right]) => left.localeCompare(right))
    ))
    summaries.push(`${kind}: ${groupedByKind[kind].map(edit => edit.id).join(", ")}`)

    if (!flags.dryRun) {
      await writeText(moduleInfo.filePath, moduleText)
    }
  }

  if (!flags.dryRun) {
    await saveReviewState(reviewState)
  }

  console.log(flags.dryRun ? "Dry run only. Would update:" : "Applied edits for:")
  for (const summary of summaries) {
    console.log(`- ${summary}`)
  }
  console.log(`Review state file: ${REVIEW_STATE_PATH}`)
}

await main()
