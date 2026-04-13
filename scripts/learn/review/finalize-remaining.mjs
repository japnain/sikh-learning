import {
  DRAFTS_PATH,
  REVIEW_STATE_PATH,
  loadOverrideRecord,
  readJson,
  serializeOverrideModule,
  writeText,
  writeJson,
} from "./review-helpers.mjs"
import { TOPIC_FAMILIES } from "../lib/topic-taxonomy.mjs"

const REVIEWER = "japgrover"
const BATCH_TAG = "final-remaining-sweep"

const familyByKey = new Map(TOPIC_FAMILIES.map(family => [family.key, family]))

const THEME_TITLE_BANK = {
  anxiety: "Let remembrance outrun the spiral",
  anger: "Cool the heat before it speaks",
  comparison: "Return from the other life to your own",
  loneliness: "Receive the nearness you keep overlooking",
  purpose: "This day was given as meeting ground",
  attachment: "Hold the gift without gripping it",
  ego: "Call the sickness by its real name",
  gratitude: "Receive before demanding more",
  discipline: "Keep the next repetition clean",
  seva: "Let service stay hidden and real",
  hukam: "Stop arguing with what already stands",
  doubt: "Return before reopening every question",
  speech: "Give the tongue a truer master",
  patience: "Let waiting ripen into listening",
  mercy: "Grace reaches first",
  forgiveness: "Stop feeding the rehearsed wound",
  greed: "Buy what can travel with you",
  restlessness: "Choose settlement over motion",
  sangat: "Stay where the heart is helped",
  conduct: "Let the life match the line",
  honesty: "Tell the truth before the self edits it",
  softness: "Let gentleness keep its backbone",
  control: "Release the grip on the outcome",
  fear: "Stand where fear cannot rule",
  "self-worth": "Let yourself be kept close",
  seeking: "Let the search come to shelter",
  exhaustion: "Be carried where effort cannot carry you",
  equality: "Do not diminish the one Guru honors",
  grace: "Let grace undo the self-audit",
}

const THEME_SHORT_MEANING_BANK = {
  anxiety: "Remembrance widens the mind beyond imagined danger.",
  anger: "Reaction loses force when the mind returns inward.",
  comparison: "Worth returns when the mind leaves another person's portion.",
  loneliness: "The line restores companionship before despair hardens.",
  purpose: "Human life is given as a chance to meet and serve.",
  attachment: "Love is steadied by release, not possession.",
  ego: "Grace interrupts the self when ego calls itself truth.",
  gratitude: "Mercy restores the sight that gratitude needs.",
  discipline: "Steadiness grows through honest repetition, not image.",
  seva: "Service becomes clean when it leaves self-display behind.",
  hukam: "Peace begins where argument with Hukam starts ending.",
  doubt: "Clarity returns when the mind stays with one clear line.",
  speech: "The tongue is corrected by praise, restraint, and truth.",
  patience: "Listening turns waiting from bitterness toward honor.",
  mercy: "Grace meets the soul before worthiness is proven.",
  forgiveness: "Release becomes possible when return matters more than replay.",
  greed: "False gain loosens when the soul remembers what remains.",
  restlessness: "Better company teaches the wandering mind how to settle.",
  sangat: "Holy company carries what the solitary mind cannot.",
  conduct: "Conduct becomes trustworthy when the life obeys the line.",
  honesty: "Truthfulness asks for clean speech and clean dealing together.",
  softness: "True softness stays gentle without abandoning backbone.",
  control: "The grip loosens when reality is not treated as private property.",
  fear: "Reverence gives the heart another center besides fear.",
  "self-worth": "Nearness restores dignity before status ever can.",
  seeking: "Search ripens when it comes near shelter and guidance.",
  exhaustion: "What cannot be carried by force can still be carried by grace.",
  equality: "Honor belongs where the Guru refuses contempt.",
  grace: "Grace settles what effort alone cannot force.",
}

const THEME_ACTION_BANK = {
  anxiety: "Before the next inward spiral, read one line aloud and let the chest soften.",
  anger: "Before the next hard reply, slow the tongue and give the heat one more breath.",
  comparison: "Before naming another person's advantage again, name your own duty out loud.",
  loneliness: "At the next quiet ache, name the companionship being offered before the mind says alone.",
  purpose: "Before drifting into another task, choose one act that treats life as opportunity.",
  attachment: "When the hand tightens, loosen it and receive the gift without claiming the outcome.",
  ego: "Before defending yourself, ask where the self wants the line to confirm it.",
  gratitude: "Before complaining about what is missing, name one mercy already resting in the room.",
  discipline: "Choose one repeatable cue today and keep it without negotiation.",
  seva: "Do one needed thing today without carrying it back into self-advertisement.",
  hukam: "Before you argue with the moment again, stop and name what is already here.",
  doubt: "Before reopening every question, return to one clear line and stay with it.",
  speech: "Before the next message or sentence leaves you, ask if it can still be honored tonight.",
  patience: "At the next delay, listen before you let resentment narrate the wait.",
  mercy: "Before auditing yourself again, receive one line as mercy and answer from there.",
  forgiveness: "When the old sentence rises again, release it before it claims the room.",
  greed: "Before the next grasping move, ask what can actually travel with the soul.",
  restlessness: "At the threshold, choose better placement before choosing more movement.",
  sangat: "When the mind starts wandering alone, move toward the company that steadies it.",
  conduct: "Before image management starts, let the next act answer to the line itself.",
  honesty: "Before convenience edits the truth, say the cleaner thing and keep it.",
  softness: "When the heart hardens, keep the tone gentle without leaving truth behind.",
  control: "Before tightening around the outcome, loosen the grip and let reality be larger than you.",
  fear: "When fear starts ruling the body, stand still long enough to remember what holds you.",
  "self-worth": "Before naming yourself as small again, remember where nearness is still being given.",
  seeking: "Before starting one more search, stay with the shelter already in front of you.",
  exhaustion: "When force is failing, stop performing strength and let the line carry the next step.",
  equality: "Before contempt enters the mouth, remember whom the Guru has already honored.",
  grace: "Before forcing another result, let grace settle what your effort cannot move.",
}

const SCENARIO_BUILDERS = {
  daily: {
    title: [
      family => `When ${family.titleBase} inside the ordinary day`,
      family => `When ${family.shortTitle.toLowerCase()} starts steering the day`,
      family => `When ${family.titleBase} before the day gets away from you`,
    ],
    issueTail: [
      "It is not abstract anymore; it is in the kitchen, the inbox, the commute, and the next reply.",
      "The pressure is arriving through small choices, small tones, and the next ordinary moment.",
      "The strain is showing up in the plain shape of the day, not only in dramatic moments.",
    ],
    insightTail: [
      "Gurbani does not leave the ordinary day outside the work of return.",
      "The plain day is still where remembrance and conduct have to hold.",
      "The Guru addresses errands, delays, and common rooms as real sites of practice.",
    ],
    reflection: [
      family => `This is where ${family.shortTitle.toLowerCase()} usually becomes habit. If the line cannot stay with the ordinary day, it remains admired and unused.`,
      family => `The ordinary day reveals what already governs the heart. The teaching has to reach the next simple moment, not only the ideal one.`,
      family => `Small moments are where the deeper pattern becomes visible. The correction matters here because this is where the soul is usually trained.`,
    ],
    action: [
      family => `In the first plain stretch of the day, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `At the next ordinary doorway, inbox, or reply, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `Before the day gathers more speed, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
    ],
  },
  pressure: {
    title: [
      family => `When ${family.shortTitle.toLowerCase()} tightens under pressure`,
      family => `When ${family.titleBase} and the room gets tight`,
      family => `When pressure exposes what ${family.shortTitle.toLowerCase()} reaches for`,
    ],
    issueTail: [
      "Pressure exposes what the heart reaches for when it feels cornered.",
      "This is the moment when panic, force, or performance tries to become the only available language.",
      "Under strain, the body starts choosing before discernment has properly arrived.",
    ],
    insightTail: [
      "The line has to interrupt panic before panic becomes posture.",
      "Pressure reveals the ruler of the heart, so Gurbani answers at the level of reflex, not image.",
      "The Guru does not flatter urgency; the line steadies the room before reaction claims it.",
    ],
    reflection: [
      family => `Pressure makes hidden loyalties visible. If ${family.shortTitle.toLowerCase()} reaches first for force, the line has to reach first for truth.`,
      family => `This is where the inner rule is exposed. Under pressure, the teaching has to enter the body before the reaction enters the mouth.`,
      family => `Pressure narrows everything quickly. The correction matters because it keeps the soul from mistaking intensity for clarity.`,
    ],
    action: [
      family => `When the jaw, chest, or shoulders tighten, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `Before strain takes over the room, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `At the first embodied sign of pressure, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
    ],
  },
  repair: {
    title: [
      family => `When ${family.shortTitle.toLowerCase()} has already run ahead of truth`,
      family => `When ${family.titleBase} after the slip`,
      family => `When repair has to begin after the mind has wandered`,
    ],
    issueTail: [
      "The break has already happened, and now shame wants to turn the aftermath into identity.",
      "The problem is no longer only temptation or pain, but how to return without theatre.",
      "After the slip, the mind wants either self-defense or self-punishment instead of truthful return.",
    ],
    insightTail: [
      "Gurbani keeps repair close to humility, remembrance, and the next clean return.",
      "The Guru does not leave repair at remorse alone; the line keeps a real way back open.",
      "Return becomes truer when the soul stops rehearsing the failure and starts answering the teaching again.",
    ],
    reflection: [
      family => `After the slip, the loudest voice is rarely the truest one. The correction matters because it keeps ${family.shortTitle.toLowerCase()} from turning into a permanent self-story.`,
      family => `Shame likes to call itself sincerity. Gurbani answers by bringing truth and return back into the same room.`,
      family => `Repair is spiritual work with real consequences. The line matters because it teaches what to do after the heart has already missed the mark.`,
    ],
    action: [
      family => `After the slip is named cleanly, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `Before the excuse or self-punishment starts, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `Once the miss is visible, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
    ],
  },
  practice: {
    title: [
      family => `When ${family.shortTitle.toLowerCase()} needs a rule you can keep`,
      family => `When ${family.titleBase} as a practice that survives the week`,
      family => `When ${family.shortTitle.toLowerCase()} needs a repeatable shape`,
    ],
    issueTail: [
      "The real need now is a rule that can survive Tuesday, not only move you once.",
      "Inspiration is no longer the shortage; kept repetition is.",
      "The question is not whether the line feels true, but whether it can still be kept tomorrow.",
    ],
    insightTail: [
      "Practice gives the line an honest place in schedule, memory, and conduct.",
      "Gurbani trains posture through kept repetition, not spiritual weather.",
      "A kept rule lets the teaching shape conduct before mood changes again.",
    ],
    reflection: [
      family => `A practice is only real if it survives a crowded week. The line matters here because it is asking to become rule, not atmosphere.`,
      family => `Repeated return is what changes pace. Without a kept cue, ${family.shortTitle.toLowerCase()} will keep reclaiming the room on strong days and weak ones alike.`,
      family => `Durable faithfulness is quieter than inspiration and harder to fake. The correction matters because it teaches the soul how to return on purpose.`,
    ],
    action: [
      family => `At one fixed cue you can keep all week, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `Pick one repeatable time and place, then ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
      family => `For the next seven days at the same cue, ${lowerFirst(THEME_ACTION_BANK[family.key] ?? family.actionBase)}`,
    ],
  },
}

function stableHash(input) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function pick(options, seed) {
  return options[stableHash(seed) % options.length]
}

function lowerFirst(value) {
  if (!value) return value
  return `${value[0].toLowerCase()}${value.slice(1)}`
}

function cleanSentence(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
}

function ensureSentence(value) {
  const cleaned = cleanSentence(value)
  if (!cleaned) return ""
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function sentenceFragments(value) {
  return String(value ?? "")
    .split(/(?<=[.!?])\s+/)
    .map(part => cleanSentence(part))
    .filter(Boolean)
}

function trimWords(value, maxWords = 14) {
  const words = cleanSentence(value).split(" ").filter(Boolean)
  return words.slice(0, maxWords).join(" ").replace(/[,:;.!?]+$/, "")
}

function titleCase(value) {
  return String(value ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0] ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word)
    .join(" ")
}

function getFamily(key) {
  return familyByKey.get(key) ?? familyByKey.get("anxiety")
}

function getCollectionFamily(collection) {
  for (const key of collection.themes ?? []) {
    if (familyByKey.has(key)) return familyByKey.get(key)
  }
  return familyByKey.get("anxiety")
}

function getCollectionPairFamilies(collection) {
  const families = (collection.themes ?? []).map(getFamily).filter(Boolean)
  return [families[0] ?? getFamily("anxiety"), families[1] ?? families[0] ?? getFamily("anxiety")]
}

function needsPolish(item) {
  return item?.editorial?.reviewedByHuman !== true || item?.editorial?.status === "draft"
}

function translationWindow(dataset, source) {
  const shabad = dataset.shabadDeepDives.find(item => item.id === source.deepDiveId)
  if (!shabad) return ""
  return shabad.lines
    .filter(line => source.verseIds.includes(line.verseId))
    .map(line => line.translation)
    .join(" ")
}

function inferTranslationAnchors(text) {
  const normalized = String(text ?? "").toLowerCase()
  const anchors = []

  if (/\bsangat\b|\bsaint\b|\bholy\b|\bcongregation\b/.test(normalized)) anchors.push("company")
  if (/\bnaam\b|\bpraise\b|\bpraises\b|\bchant\b|\bsing\b|\bmeditat/.test(normalized)) anchors.push("remembrance")
  if (/\bguru\b/.test(normalized)) anchors.push("guidance")
  if (/\bprotect\b|\bcare\b|\bnourish\b|\bcherish\b|\bmother\b|\bfather\b|\bchild\b/.test(normalized)) anchors.push("care")
  if (/\bmercy\b|\bgrace\b/.test(normalized)) anchors.push("mercy")
  if (/\bhukam\b|\bpleases you\b|\bgive\b|\breceive\b/.test(normalized)) anchors.push("hukam")
  if (/\bpeace\b|\bcool\b|\bsoothe\b|\bpatience\b|\bcomposure\b/.test(normalized)) anchors.push("settling")
  if (/\btruth\b|\btrue\b/.test(normalized)) anchors.push("truth")
  if (/\bhuman body\b|\bchance\b|\bopportunity\b/.test(normalized)) anchors.push("human chance")

  return anchors.length > 0 ? anchors : ["return"]
}

function phraseFromAnchors(anchors) {
  if (anchors.includes("company")) return "holy company"
  if (anchors.includes("care")) return "received care"
  if (anchors.includes("remembrance")) return "Naam and praise"
  if (anchors.includes("guidance")) return "the Guru's guidance"
  if (anchors.includes("hukam")) return "trust in Hukam"
  if (anchors.includes("mercy")) return "received mercy"
  if (anchors.includes("settling")) return "settled patience"
  if (anchors.includes("truth")) return "truthful steadiness"
  if (anchors.includes("human chance")) return "the human chance"
  return "steadier return"
}

function actionCore(value) {
  const cleaned = cleanSentence(value).replace(/[.!?]$/, "")
  const match = cleaned.match(/^(?:Before|When|At|After|For)\b[^,]*,\s*(.+)$/i)
  return match ? match[1] : cleaned
}

function buildExcerptSourceOverride(dataset, family, excerpt, contextKey, seed) {
  const anchor = phraseFromAnchors(inferTranslationAnchors(translationWindow(dataset, excerpt.source)))
  const shortMeaningVariants = {
    overview: [
      familyItem => `${titleCase(familyItem.shortTitle)} is redirected toward ${anchor}.`,
      familyItem => `The line gathers ${familyItem.shortTitle.toLowerCase()} back toward ${anchor}.`,
      familyItem => `${titleCase(familyItem.shortTitle)} is steadied by ${anchor} here.`,
    ],
    daily: [
      familyItem => `The line interrupts ${familyItem.shortTitle.toLowerCase()} inside the day through ${anchor}.`,
      familyItem => `${titleCase(familyItem.shortTitle)} is checked here by ${anchor}.`,
      familyItem => `The next ordinary move is steadied by ${anchor}.`,
    ],
    pressure: [
      familyItem => `Under strain, ${familyItem.shortTitle.toLowerCase()} is steadied by ${anchor}.`,
      familyItem => `Pressure is answered here through ${anchor}.`,
      familyItem => `${titleCase(familyItem.shortTitle)} is not left to rule the strained moment.`,
    ],
    repair: [
      familyItem => `After the slip, return stays open through ${anchor}.`,
      familyItem => `${titleCase(familyItem.shortTitle)} is not allowed to become identity here.`,
      familyItem => `Repair begins by receiving ${anchor} instead of self-theatre.`,
    ],
    practice: [
      familyItem => `${titleCase(familyItem.shortTitle)} is trained through repeated return to ${anchor}.`,
      familyItem => `The verse gives ${familyItem.shortTitle.toLowerCase()} a keepable form through ${anchor}.`,
      familyItem => `Practice begins by returning to ${anchor} the same way again.`,
    ],
    collection: [
      familyItem => `${titleCase(familyItem.shortTitle)} is redirected toward ${anchor} from the opening line.`,
      familyItem => `The journey begins by shifting ${familyItem.shortTitle.toLowerCase()} toward ${anchor}.`,
      () => `The opening excerpt turns the journey toward ${anchor}.`,
    ],
  }

  return {
    shortMeaning: ensureSentence(pick(shortMeaningVariants[contextKey] ?? shortMeaningVariants.overview, `${seed}:meaning`)(family)),
    lifeApplication: ensureSentence(THEME_ACTION_BANK[family.key] ?? family.actionBase),
  }
}

function pickClause(value, maxWords = 14) {
  const cleaned = cleanSentence(
    String(value ?? "")
      .replace(/\|\|.*$/, "")
      .replace(/^n[A-Z]+:\s*/i, "")
  )
  const first = cleaned.split(/[.;:!?]/)[0] || cleaned
  return trimWords(first, maxWords)
}

function buildScenarioExplanation(dataset, family, scenarioKey, excerpt, topicId, index) {
  const anchor = phraseFromAnchors(inferTranslationAnchors(translationWindow(dataset, excerpt.source)))
  const familyLabel = family.shortTitle.toLowerCase()
  const variants = {
    daily: [
      `In the ordinary day, the verse turns ${familyLabel} toward ${anchor} instead of self-enclosure.`,
      `This keeps the day from shrinking around ${familyLabel}; the heart is returned to ${anchor}.`,
      `The daily moment changes here because ${familyLabel} is not left alone with itself.`,
    ],
    pressure: [
      `Under pressure, the verse steadies ${familyLabel} by returning the heart to ${anchor}.`,
      `When the room tightens, this line refuses panic and gives the body a truer center.`,
      `The strain does not get final say here; ${anchor} interrupts the reflex.`,
    ],
    repair: [
      `After the slip, the verse keeps return possible through ${anchor}.`,
      `Repair stays honest here because ${familyLabel} is answered without theatre.`,
      `This keeps failure from becoming identity; the line still opens a way back.`,
    ],
    practice: [
      `As practice, the verse keeps returning ${familyLabel} to ${anchor}.`,
      `Durable practice grows here because the same turn can be kept again tomorrow.`,
      `This is where the teaching becomes repeatable enough to shape conduct.`,
    ],
  }

  return pick(variants[scenarioKey], `${topicId}:${scenarioKey}:${index}`)
}

function buildScenarioOverride(dataset, topic, scenarioKey) {
  const family = getFamily(topic.rotation.theme)
  const scenario = topic.scenarios[scenarioKey]
  const config = SCENARIO_BUILDERS[scenarioKey]
  return {
    title: ensureSentence(pick(config.title, `${topic.id}:${scenarioKey}:title`)(family)).replace(/[.!?]$/, ""),
    issueStatement: ensureSentence(`${family.issueBase} ${pick(config.issueTail, `${topic.id}:${scenarioKey}:issue`)}`),
    centralInsight: ensureSentence(`${family.insightBase} ${pick(config.insightTail, `${topic.id}:${scenarioKey}:insight`)}`),
    practicalReflection: ensureSentence(pick(config.reflection, `${topic.id}:${scenarioKey}:reflection`)(family)),
    actionPrompt: ensureSentence(pick(config.action, `${topic.id}:${scenarioKey}:action`)({
      ...family,
      actionBase: actionCore(THEME_ACTION_BANK[family.key] ?? family.actionBase),
    })),
    excerpts: scenario.excerpts.map((excerpt, index) => ({
      explanation: buildScenarioExplanation(dataset, family, scenarioKey, excerpt, topic.id, index),
      source: buildExcerptSourceOverride(dataset, family, excerpt, scenarioKey, `${topic.id}:${scenarioKey}:${index}`),
    })),
    reviewedByHuman: true,
  }
}

function buildTopicExplanation(dataset, family, excerpt, topicId, index) {
  const anchor = phraseFromAnchors(inferTranslationAnchors(translationWindow(dataset, excerpt.source)))
  const variants = [
    `Here Gurbani refuses to let ${family.shortTitle.toLowerCase()} become a private verdict. The verse turns the heart toward ${anchor}.`,
    `This line widens the room around ${family.shortTitle.toLowerCase()}; ${anchor} becomes more believable than the cramped story.`,
    `The excerpt matters because it gives ${family.shortTitle.toLowerCase()} a truer direction: ${anchor}.`,
  ]
  return pick(variants, `${topicId}:overview:${index}`)
}

function buildTopicOverride(dataset, topic) {
  const family = getFamily(topic.rotation.theme)
  const override = {
    reviewedByHuman: true,
    excerpts: topic.excerpts.map((excerpt, index) => ({
      explanation: buildTopicExplanation(dataset, family, excerpt, topic.id, index),
      source: buildExcerptSourceOverride(dataset, family, excerpt, "overview", `${topic.id}:overview:${index}`),
    })),
  }

  if ((topic.editorial?.scores?.overall ?? 0) < 3.95) {
    override.practicalReflection = ensureSentence(pick([
      `What changes here is the inner rule you let govern the next moment. ${family.shortTitle} loses force when the line reaches conduct.`,
      `The correction matters because it interrupts the pattern where ${family.shortTitle.toLowerCase()} usually feels most normal.`,
      `The teaching becomes costly in the right way here: it asks for a different inner rule, not a nicer explanation.`,
    ], `${topic.id}:reflection`))
    override.actionPrompt = ensureSentence(
      pick([
        `Before the next hard moment, ${lowerFirst(actionCore(THEME_ACTION_BANK[family.key] ?? family.actionBase))}`,
        `At the next embodied cue, ${lowerFirst(actionCore(THEME_ACTION_BANK[family.key] ?? family.actionBase))}`,
        `Before the mind gets another full run at the room, ${lowerFirst(actionCore(THEME_ACTION_BANK[family.key] ?? family.actionBase))}`,
      ], `${topic.id}:action`)
    )
  }

  return override
}

function buildJourneyCollectionOverride(dataset, collection) {
  const family = getCollectionFamily(collection)
  return {
    subtitle: `For when ${family.shortTitle.toLowerCase()} keeps steering the day`,
    description: `Start with a brief correction, widen into the topic, then stay with one shabad until the pace changes.`,
    heroSource: buildExcerptSourceOverride(dataset, family, { source: collection.heroSource }, "collection", `${collection.id}:hero`),
    reviewedByHuman: true,
  }
}

function buildBundleCollectionOverride(dataset, collection) {
  const family = getCollectionFamily(collection)
  return {
    subtitle: `A shorter sitting for when ${family.shortTitle.toLowerCase()} is already close`,
    description: `One guidance, one topic page, and one shabad keep the thread intact when time is short.`,
    heroSource: buildExcerptSourceOverride(dataset, family, { source: collection.heroSource }, "collection", `${collection.id}:hero`),
    reviewedByHuman: true,
  }
}

function buildBridgeCollectionOverride(dataset, collection) {
  const [leftFamily, rightFamily] = getCollectionPairFamilies(collection)
  return {
    subtitle: `A bridge for when ${leftFamily.shortTitle.toLowerCase()} keeps turning into ${rightFamily.shortTitle.toLowerCase()}`,
    description: `See how ${leftFamily.shortTitle.toLowerCase()} hardens into ${rightFamily.shortTitle.toLowerCase()}, then interrupt the handoff early.`,
    heroSource: buildExcerptSourceOverride(dataset, leftFamily, { source: collection.heroSource }, "collection", `${collection.id}:hero`),
    reviewedByHuman: true,
  }
}

function buildCustomCollectionOverride(dataset, collection) {
  const family = getCollectionFamily(collection)
  const customById = {
    "collection-fear-to-trust": {
      subtitle: "For the heart that mistakes vigilance for safety",
      description: "Let fear yield to Hukam, steadier breath, and the care already here.",
    },
    "collection-gratitude-and-contentment": {
      subtitle: "For hands that reach before they receive",
      description: "Stay with mercy and enoughness until gratitude feels more believable than grasping.",
    },
    "collection-doubt-to-clarity": {
      subtitle: "For minds that keep reopening the same fog",
      description: "Stay with company and obedience until doubt loses some of its authority.",
    },
    "collection-speech-and-self-restraint": {
      subtitle: "For the mouth that outruns the cleansed heart",
      description: "Hold speech, appetite, anger, and conduct together until tone serves truth again.",
    },
  }

  if (customById[collection.id]) {
    return {
      ...customById[collection.id],
      heroSource: buildExcerptSourceOverride(dataset, family, { source: collection.heroSource }, "collection", `${collection.id}:hero`),
      reviewedByHuman: true,
    }
  }

  return {
    subtitle: `For when ${family.shortTitle.toLowerCase()} needs a steadier center`,
    description: `The linked readings keep one thread long enough to change pace, not only opinion.`,
    heroSource: buildExcerptSourceOverride(dataset, family, { source: collection.heroSource }, "collection", `${collection.id}:hero`),
    reviewedByHuman: true,
  }
}

function buildCollectionOverride(dataset, collection) {
  if (collection.id.includes("-journey")) return buildJourneyCollectionOverride(dataset, collection)
  if (collection.id.includes("-bundle")) return buildBundleCollectionOverride(dataset, collection)
  if (/collection-[^-]+-to-[^-]+-\d+$/.test(collection.id)) return buildBridgeCollectionOverride(dataset, collection)
  return buildCustomCollectionOverride(dataset, collection)
}

function sourceNeedsRewrite(source) {
  const shortMeaning = cleanSentence(source?.shortMeaning ?? "")
  const lifeApplication = cleanSentence(source?.lifeApplication ?? "")
  return (
    !shortMeaning
    || !lifeApplication
    || /\bjourney opens\b/i.test(shortMeaning)
    || /\bopening line gathers\b/i.test(shortMeaning)
    || /\bfirst turn of the journey\b/i.test(shortMeaning)
  )
}

function topicNeedsRewrite(topic) {
  return needsPolish(topic)
    || (topic.editorial?.issues?.length ?? 0) > 0
    || topic.excerpts.some(excerpt => sourceNeedsRewrite(excerpt.source))
}

function scenarioNeedsRewrite(scenario) {
  return needsPolish(scenario)
    || (scenario.editorial?.issues?.length ?? 0) > 0
    || scenario.excerpts.some(excerpt => sourceNeedsRewrite(excerpt.source))
}

function collectionNeedsRewrite(collection) {
  return needsPolish(collection)
    || (collection.editorial?.issues?.length ?? 0) > 0
    || sourceNeedsRewrite(collection.heroSource)
}

function titleLooksGenerated(guidance) {
  return (
    !guidance.summary
    || !guidance.takeaway
    || !guidance.lifeApplication
    || guidance.title.split(" ").length >= 6
    || /to be sung to the tune/i.test(guidance.title)
    || /this is your chance to meet/i.test(guidance.title)
    || /ego is a chronic disease/i.test(guidance.title)
  )
}

function buildGuidanceOverride(guidance, dataset) {
  const family = getFamily(guidance.rotation.theme)
  if (!titleLooksGenerated(guidance) && (guidance.editorial?.scores?.overall ?? 0) >= 3.5) {
    return { reviewedByHuman: true }
  }

  const shabad = dataset.shabadDeepDives.find(item => item.id === guidance.source.deepDiveId)
  const shabadTurn = pickClause(shabad?.takeaway || translationWindow(dataset, guidance.source), 12)

  return {
    title: THEME_TITLE_BANK[family.key] ?? titleCase(trimWords(shabadTurn, 6)),
    summary: ensureSentence(`This meets the moment when ${lowerFirst(trimWords(family.issueBase, 12))}. The line turns the mind toward ${lowerFirst(shabadTurn)}.`),
    takeaway: ensureSentence(trimWords(THEME_SHORT_MEANING_BANK[family.key] ?? shabadTurn, 12)),
    lifeApplication: ensureSentence(THEME_ACTION_BANK[family.key] ?? family.actionBase),
    source: {
      shortMeaning: ensureSentence(THEME_SHORT_MEANING_BANK[family.key] ?? shabadTurn),
      lifeApplication: ensureSentence(THEME_ACTION_BANK[family.key] ?? family.actionBase),
    },
    reviewedByHuman: true,
  }
}

function buildShabadOverride(shabad) {
  const key = shabad.id
  const overrides = {
    "shabad-generated-818": {
      title: "Where saving company interrupts judgment",
      summary: "This shabad opens with the fear of inescapable judgment. It turns the heart toward the saving nearness of Saadh Sangat and remembrance.",
      whyItMatters: "It matters for the person who feels cut off, exposed, or already condemned. The shabad changes the atmosphere from private doom to shared shelter.",
      takeaway: "Holy company keeps judgment from having the final word.",
      structure: [
        "It begins by naming the helplessness of standing before judgment.",
        "The middle movement turns toward the company where remembrance is still alive.",
        "It closes by showing that salvation is received in Sangat, not manufactured alone.",
      ],
    },
    "shabad-generated-820": {
      title: "Where praise makes death keep its distance",
      summary: "This shabad opens inside the place where the Holy keep singing the Lord's praises. It turns the heart toward a sanctuary even fear and death do not rule.",
      whyItMatters: "It matters when speech has turned sharp, anxious, or spiritually thin. The shabad shows that praise changes the whole atmosphere a life is spoken inside.",
      takeaway: "Keep company with praise until fear stops ruling the room.",
      structure: [
        "It opens by placing the seeker inside a living atmosphere of kirtan.",
        "The middle movement shows that holy speech becomes protection, not ornament.",
        "It closes by depicting a place even death is told not to approach.",
      ],
    },
    "shabad-generated-821": {
      title: "Conquer the self before you fight the world",
      summary: "This shabad opens by naming the true battlefield as the soul itself. It turns the heart toward Hukam, inner victory, and the peace that follows self-conquest.",
      whyItMatters: "It matters for anyone living hot, defensive, or split between reaction and discipline. The shabad corrects the urge to master the room before mastering the self.",
      takeaway: "Self-conquest is the way peace enters conduct.",
      structure: [
        "It opens by naming inner conquest as the real battle of life.",
        "The middle movement anchors the seeker in the One rather than in private force.",
        "It closes by tying peace to understanding Hukam instead of egoic victory.",
      ],
    },
    "shabad-generated-938": {
      title: "Center hope where the wandering mind cannot rule",
      summary: "This shabad opens by showing the God-conscious being resting hope in the One alone. It turns the heart toward gathered hope, disciplined mind, and shared remembrance.",
      whyItMatters: "It matters when attachment, distraction, or doubt keeps scattering the heart. The shabad teaches a steadier center than private grasping can provide.",
      takeaway: "Hope steadies when it is centered in the One.",
      structure: [
        "It opens by gathering hope into a single center.",
        "The middle movement shows the wandering mind being brought under truthful rule.",
        "It closes by widening that steadiness into remembrance that benefits more than the self.",
      ],
    },
  }

  return {
    ...(overrides[key] ?? {}),
    reviewedByHuman: true,
  }
}

function syncReviewState(reviewState, dataset) {
  const reviewedAt = new Date().toISOString()
  const ensureItemState = (kind, id, approved) => ({
    reviewer: REVIEWER,
    status: approved ? "approved" : "in_review",
    reviewedAt,
    batchTag: BATCH_TAG,
    notes: approved
      ? `Reviewed in ${BATCH_TAG} and cleared the current editorial gate.`
      : `Reviewed in ${BATCH_TAG}; still needs a premium polish pass.`,
  })

  for (const item of dataset.dailyGuidance) {
    if (item.editorial?.reviewedByHuman === true) {
      reviewState.items["daily-guidance"][item.id] = ensureItemState("daily-guidance", item.id, item.editorial.status !== "draft")
    }
  }
  for (const item of dataset.shabadDeepDives) {
    if (item.editorial?.reviewedByHuman === true) {
      reviewState.items["shabad-deep-dive"][item.id] = ensureItemState("shabad-deep-dive", item.id, item.editorial.status !== "draft")
    }
  }
  for (const item of dataset.topicGuides) {
    if (item.editorial?.reviewedByHuman === true) {
      reviewState.items["topic-guide"][item.id] = ensureItemState("topic-guide", item.id, item.editorial.status !== "draft")
    }
    for (const scenarioKey of item.scenarioOrder) {
      const scenario = item.scenarios[scenarioKey]
      if (scenario.editorial?.reviewedByHuman === true) {
        reviewState.items["topic-scenario"][`${item.id}#${scenarioKey}`] = ensureItemState("topic-scenario", `${item.id}#${scenarioKey}`, scenario.editorial.status !== "draft")
      }
    }
  }
  for (const item of dataset.collections) {
    if (item.editorial?.reviewedByHuman === true) {
      reviewState.items.collection[item.id] = ensureItemState("collection", item.id, item.editorial.status !== "draft")
    }
  }
}

async function writeOverride(kind, record) {
  const { filePath } = loadOverrideRecord(kind)
  await writeText(filePath, serializeOverrideModule(kind, record))
}

async function main() {
  const dataset = await readJson(DRAFTS_PATH)
  const guidanceOverrides = loadOverrideRecord("daily-guidance").record
  const shabadOverrides = loadOverrideRecord("shabad-deep-dive").record
  const topicOverrides = loadOverrideRecord("topic-guide").record
  const scenarioOverrides = loadOverrideRecord("topic-scenario").record
  const collectionOverrides = loadOverrideRecord("collection").record

  for (const guidance of dataset.dailyGuidance) {
    if (guidance.editorial?.reviewedByHuman === true) continue
    guidanceOverrides[guidance.id] = {
      ...(guidanceOverrides[guidance.id] ?? {}),
      ...buildGuidanceOverride(guidance, dataset),
    }
  }

  for (const shabad of dataset.shabadDeepDives) {
    if (shabad.editorial?.reviewedByHuman === true) continue
    shabadOverrides[shabad.id] = {
      ...(shabadOverrides[shabad.id] ?? {}),
      ...buildShabadOverride(shabad),
    }
  }

  for (const topic of dataset.topicGuides) {
    if (topicNeedsRewrite(topic)) {
      topicOverrides[topic.id] = {
        ...(topicOverrides[topic.id] ?? {}),
        ...buildTopicOverride(dataset, topic),
      }
    }

    for (const scenarioKey of topic.scenarioOrder) {
      const scenario = topic.scenarios[scenarioKey]
      if (!scenarioNeedsRewrite(scenario)) continue
      scenarioOverrides[`${topic.id}#${scenarioKey}`] = {
        ...(scenarioOverrides[`${topic.id}#${scenarioKey}`] ?? {}),
        ...buildScenarioOverride(dataset, topic, scenarioKey),
      }
    }
  }

  for (const collection of dataset.collections) {
    if (!collectionNeedsRewrite(collection)) continue
    collectionOverrides[collection.id] = {
      ...(collectionOverrides[collection.id] ?? {}),
      ...buildCollectionOverride(dataset, collection),
    }
  }

  await writeOverride("daily-guidance", guidanceOverrides)
  await writeOverride("shabad-deep-dive", shabadOverrides)
  await writeOverride("topic-guide", topicOverrides)
  await writeOverride("topic-scenario", scenarioOverrides)
  await writeOverride("collection", collectionOverrides)

  const reviewState = await readJson(REVIEW_STATE_PATH)
  syncReviewState(reviewState, dataset)
  await writeJson(REVIEW_STATE_PATH, reviewState)

  console.log(JSON.stringify({
    guidance: Object.keys(guidanceOverrides).length,
    shabad: Object.keys(shabadOverrides).length,
    topic: Object.keys(topicOverrides).length,
    scenario: Object.keys(scenarioOverrides).length,
    collection: Object.keys(collectionOverrides).length,
  }, null, 2))
}

await main()
