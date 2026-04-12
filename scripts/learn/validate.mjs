import { validateDrafts } from "./lib/pipeline.mjs"

const report = await validateDrafts()

console.log(JSON.stringify(report, null, 2))

if (report.hardFailures.length > 0) {
  process.exitCode = 1
}
