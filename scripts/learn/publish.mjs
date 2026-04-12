import { publishLearnArchive } from "./lib/pipeline.mjs"

const result = await publishLearnArchive()

console.log(
  `Published Learn archive: ${result.validation.counts.dailyGuidance} guidance, ${result.validation.counts.shabadDeepDives} shabads, ${result.validation.counts.topicGuides} canonical topics, ${result.validation.counts.topicScenarios} scenarios, ${result.validation.counts.collections} collections.`
)
