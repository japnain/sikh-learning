import { execFileSync } from "node:child_process"
import { HARD_BANNED_PATTERNS } from "../lib/style-guide.mjs"
import { PROJECT_ROOT } from "./review-helpers.mjs"

function getStagedFiles() {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { cwd: PROJECT_ROOT, encoding: "utf8" }
  )

  return output
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(filePath => /\.(json|ts)$/i.test(filePath))
}

function getStagedContent(filePath) {
  return execFileSync(
    "git",
    ["show", `:${filePath}`],
    { cwd: PROJECT_ROOT, encoding: "utf8" }
  )
}

function main() {
  const stagedFiles = getStagedFiles()
  const failures = []

  for (const filePath of stagedFiles) {
    const content = getStagedContent(filePath)
    const matches = HARD_BANNED_PATTERNS
      .filter(pattern => pattern.test(content))
      .map(pattern => pattern.toString())

    if (matches.length > 0) {
      failures.push({ filePath, matches })
    }
  }

  if (failures.length > 0) {
    console.error("Blocked by hard-banned learn editorial phrases:")
    for (const failure of failures) {
      console.error(`- ${failure.filePath}`)
      for (const match of failure.matches) {
        console.error(`  ${match}`)
      }
    }
    process.exitCode = 1
    return
  }

  console.log("No hard-banned phrases found in staged JSON/TS files.")
}

main()
