import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"
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

const SCRIPTURE_FIELD_NAMES = new Set([
  "gurmukhi",
  "transliteration",
  "translation",
  "original",
])

function shouldScanJsonString(keyPath) {
  if (keyPath.some(key => SCRIPTURE_FIELD_NAMES.has(key))) {
    return false
  }

  return true
}

function collectJsonStrings(value, keyPath = [], strings = []) {
  if (typeof value === "string") {
    if (shouldScanJsonString(keyPath)) {
      strings.push(value)
    }
    return strings
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectJsonStrings(item, [...keyPath, String(index)], strings))
    return strings
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectJsonStrings(item, [...keyPath, key], strings)
    }
  }

  return strings
}

function getScannableContent(filePath, content) {
  if (filePath.startsWith(".hermes/") || /\.test\.[cm]?[jt]sx?$/.test(filePath)) {
    return ""
  }

  if (!filePath.startsWith("public/data/learn/") || !filePath.endsWith(".json")) {
    return content
  }

  try {
    return collectJsonStrings(JSON.parse(content)).join("\n")
  } catch {
    return content
  }
}

export function collectBannedPhraseMatchesForFileContent(filePath, content) {
  const scannableContent = getScannableContent(filePath, content)

  return HARD_BANNED_PATTERNS
    .filter(pattern => pattern.test(scannableContent))
    .map(pattern => pattern.toString())
}

function main() {
  const stagedFiles = getStagedFiles()
  const failures = []

  for (const filePath of stagedFiles) {
    const content = getStagedContent(filePath)
    const matches = collectBannedPhraseMatchesForFileContent(filePath, content)

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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
