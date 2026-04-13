import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { publishLearnArchive } from "./lib/pipeline.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "../..")
const DRAFTS_PATH = path.join(PROJECT_ROOT, "scripts/learn/.cache/learn-drafts.json")
const VALIDATION_PATH = path.join(PROJECT_ROOT, "scripts/learn/.cache/learn-validation.json")

try {
  const result = await publishLearnArchive()

  console.log(
    `Published Learn archive: ${result.validation.counts.dailyGuidance} guidance, ${result.validation.counts.shabadDeepDives} shabads, ${result.validation.counts.topicGuides} canonical topics, ${result.validation.counts.topicScenarios} scenarios, ${result.validation.counts.collections} collections.`
  )
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (!errorMessage.startsWith("Learn archive validation failed:")) {
    console.error(errorMessage)
  }

  try {
    const report = JSON.parse(await fs.readFile(VALIDATION_PATH, "utf8"))
    console.error(
      `Draft baseline refreshed but publish is blocked: ${report.hardFailures.length} hard failures, ${report.warnings.length} warnings.`
    )
    for (const failure of report.hardFailures.slice(0, 12)) {
      console.error(`- ${failure}`)
    }
    if (report.hardFailures.length > 12) {
      console.error(`...and ${report.hardFailures.length - 12} more hard failures.`)
    }
    console.error(`Draft cache: ${DRAFTS_PATH}`)
    console.error(`Validation report: ${VALIDATION_PATH}`)
  } catch {
    // Ignore missing cache paths and preserve the original failure.
  }

  process.exitCode = 1
}
