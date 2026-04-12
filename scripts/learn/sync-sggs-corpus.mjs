import { syncSggsCorpus } from "./lib/pipeline.mjs"

const refresh = process.argv.includes("--refresh")
const shabadTargetArg = process.argv.find(argument => argument.startsWith("--shabad-target="))
const shabadTarget = shabadTargetArg ? Number(shabadTargetArg.split("=")[1]) : undefined

const corpus = await syncSggsCorpus({
  refresh,
  shabadTarget,
})

console.log(`Synced SGGS corpus with ${corpus.shabads.length} shabads.`)
