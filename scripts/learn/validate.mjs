import { validateDrafts } from "./lib/pipeline.mjs"

const report = await validateDrafts()

console.log(JSON.stringify(report, null, 2))

if (report.hardFailures.length > 0) {
  console.error(
    `learn:validate found ${report.hardFailures.length} hard failures across ${report.counts.dailyGuidance} guidance, ${report.counts.shabadDeepDives} shabads, ${report.counts.topicGuides} topics, ${report.counts.topicScenarios} scenarios, and ${report.counts.collections} collections.`
  )
  process.exitCode = 1
}
