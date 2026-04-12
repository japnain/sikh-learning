import { generateDrafts } from "./lib/pipeline.mjs"

const drafts = await generateDrafts()

console.log(
  `Generated drafts: ${drafts.dailyGuidance.length} guidance, ${drafts.shabadDeepDives.length} shabads, ${drafts.topicGuides.length} canonical topics, ${drafts.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0)} scenarios, ${drafts.collections.length} collections.`
)
