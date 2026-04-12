import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "../..")
const DIST_ASSETS_DIR = path.join(PROJECT_ROOT, "dist/assets")

async function main() {
  const assetNames = await fs.readdir(DIST_ASSETS_DIR)
  const learnChunk = assetNames.find(name => /^Learn-.*\.js$/.test(name))
  const repositoryChunk = assetNames.find(name => /^learnRepository-.*\.js$/.test(name))

  if (!learnChunk) {
    throw new Error("Bundle guard could not find the Learn route chunk in dist/assets")
  }

  if (!repositoryChunk) {
    throw new Error("Bundle guard expected a dedicated learnRepository chunk, but none was emitted")
  }

  const learnChunkPath = path.join(DIST_ASSETS_DIR, learnChunk)
  const learnSource = await fs.readFile(learnChunkPath, "utf8")
  const learnSizeKb = Buffer.byteLength(learnSource, "utf8") / 1024

  if (learnSizeKb > 100) {
    throw new Error(`Learn route chunk is ${learnSizeKb.toFixed(2)} kB, above the 100 kB guard rail`)
  }

  const obviousInlineMarkers = [
    '"dailyGuidance":[',
    '"shabadDeepDives":[',
    '"topicGuides":[',
    '"collections":[',
  ]

  for (const marker of obviousInlineMarkers) {
    if (learnSource.includes(marker)) {
      throw new Error(`Learn route chunk appears to inline archive payload data via marker ${marker}`)
    }
  }

  console.log(`Bundle guard passed: ${learnChunk} is ${learnSizeKb.toFixed(2)} kB and archive payloads remain external.`)
}

await main()
