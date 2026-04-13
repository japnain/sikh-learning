import { KIND_ORDER, flattenReviewItems, loadArchiveDataset, loadAuditCache, loadReviewState, median } from "./review-helpers.mjs"

function pad(value, width) {
  return `${value}`.padEnd(width, " ")
}

async function main() {
  const { dataset } = await loadArchiveDataset({ preferDrafts: true })
  const audit = await loadAuditCache()
  const reviewState = await loadReviewState()
  const entries = flattenReviewItems(dataset)

  const rows = KIND_ORDER.map((kind) => {
    const kindEntries = entries.filter(entry => entry.kind === kind)
    const polished = kindEntries.filter(({ id }) => {
      const status = reviewState.items[kind]?.[id]?.status ?? "pending"
      return status === "polished" || status === "approved"
    }).length
    const medianOverall = median(kindEntries.map(entry => entry.item.editorial?.scores?.overall ?? 0))
    const humanReviewed = kindEntries.filter(entry => entry.item.editorial?.reviewedByHuman === true).length

    return {
      kind,
      polished,
      total: kindEntries.length,
      humanReviewed,
      medianOverall: Number(medianOverall.toFixed(2)),
      auditAverage:
        audit?.archive?.byKind?.[
          kind === "daily-guidance"
            ? "dailyGuidance"
            : kind === "shabad-deep-dive"
              ? "shabadDeepDives"
              : kind === "topic-guide"
                ? "topicGuides"
                : kind === "topic-scenario"
                  ? "topicScenarios"
                  : "collections"
        ]?.averageOverall ?? null,
    }
  })

  console.log(
    [
      `${pad("Kind", 18)} ${pad("Polished", 12)} ${pad("Human", 10)} ${pad("Median", 8)} AuditAvg`,
      ...rows.map(row =>
        `${pad(row.kind, 18)} ${pad(`${row.polished} / ${row.total}`, 12)} ${pad(`${row.humanReviewed} / ${row.total}`, 10)} ${pad(row.medianOverall.toFixed(2), 8)} ${row.auditAverage === null ? "n/a" : Number(row.auditAverage).toFixed(2)}`
      ),
    ].join("\n")
  )
}

await main()
