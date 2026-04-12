import { generateDrafts } from "./lib/pipeline.mjs"

const drafts = await generateDrafts()

console.log(
  `Generated drafts: ${drafts.dailyGuidance.length} guidance, ${drafts.shabadDeepDives.length} shabads, ${drafts.topicGuides.length} topics, ${drafts.collections.length} collections.`
)
