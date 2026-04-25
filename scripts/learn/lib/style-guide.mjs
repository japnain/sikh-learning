export const EDITORIAL_VOICE_VERSION = "sggs-editorial-v1"

export const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /coming soon/i,
  /lorem ipsum/i,
]

export const HARD_BANNED_PATTERNS = [
  /\beverything will be okay\b/i,
  /\byou are exactly where you need to be\b/i,
  /\bmanifest(?:ing)?\b/i,
  /\bheals? everything\b/i,
  /\bfix(?:es|ing) everything\b/i,
  /\bfeels trying\b/i,
  /\bthis is for anyone who feels\b/i,
  /\blet this stay with you:/i,
  /\bhold onto this:/i,
  /\bcarry this with you:/i,
  /\bquestion appetite avoids\b/i,
  /\bprofit that can follow you\b/i,
  /\bkeep this close\b/i,
  /\bdo not let the day outrun this\b/i,
  /^(?:First|Then|Finally), it\b/im,
  /named plainly here before the mind has time to decorate it/i,
  /begin with the part of the day already in front of you/i,
  /let the line meet the ordinary room before self-judgment/i,
  /the theme is named plainly here/i,
  /use the line before the pressure chooses your tone/i,
  /let the line decide the next tone before urgency does/i,
  /keep the line close enough to become a repeatable posture/i,
  /after the reaction, make the next return smaller and truer/i,
]

export const WEAK_COPY_PATTERNS = [
  /\bsmall enough to carry through the day\b/i,
  /\blet this line become the correction before the reaction\b/i,
  /\bnot an improvised slogan\b/i,
  /\bnot just\b/i,
  /\bbecomes usable when\b/i,
  /\bthe deeper need is not\b/i,
]

export const ACTION_VERBS = [
  "ask",
  "breathe",
  "bow",
  "carry",
  "catch",
  "choose",
  "drop",
  "feel",
  "hold",
  "interrupt",
  "lean",
  "lift",
  "move",
  "read",
  "name",
  "notice",
  "pause",
  "plant",
  "refuse",
  "release",
  "return",
  "let",
  "guard",
  "wait",
  "receive",
  "practice",
  "bring",
  "listen",
  "stop",
  "step",
  "stay",
  "touch",
  "unclench",
  "widen",
]

export const BEAUTY_SIGNALS = [
  "beloved",
  "breath",
  "cool",
  "grace",
  "mercy",
  "quiets",
  "refuge",
  "shelter",
  "sanctuary",
  "steady",
  "return",
  "quiet",
  "tender",
  "truth",
  "truthful",
  "receive",
  "held",
  "listen",
  "belonging",
  "care",
  "nearness",
  "praise",
]

export const CONCRETE_SIGNALS = [
  "body",
  "breath",
  "card",
  "chest",
  "today",
  "day",
  "before",
  "after",
  "when",
  "one",
  "next",
  "room",
  "screen",
  "doorway",
  "floor",
  "gaze",
  "hand",
  "hands",
  "jaw",
  "meeting",
  "message",
  "mouth",
  "purchase",
  "reply",
  "scroll",
  "sink",
  "tongue",
  "throat",
  "threshold",
  "heart",
  "mind",
  "line",
  "verse",
]

export const SHELL_COPY_WARNING_PATTERNS = [
  /\bpremium\b/i,
  /\bliving archive\b/i,
  /\bcomposed ritual\b/i,
]

const REPETITION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "under",
  "when",
  "with",
  "your",
])

export function normalizeEditorialText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function toTokens(value) {
  return normalizeEditorialText(value).split(" ").filter(Boolean)
}

export function splitSentences(value) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
}

export function averageSentenceLength(value) {
  const sentences = splitSentences(value)
  if (sentences.length === 0) return 0
  const totalWords = sentences.reduce((count, sentence) => count + toTokens(sentence).length, 0)
  return totalWords / sentences.length
}

export function countPatternMatches(value, patterns) {
  return patterns.filter(pattern => pattern.test(value)).length
}

export function countKeywordOverlap(text, keywords) {
  const tokenSet = new Set(toTokens(text))
  return keywords.filter(keyword => tokenSet.has(normalizeEditorialText(keyword))).length
}

export function detectRepeatedNgrams(value, size = 3) {
  const tokens = toTokens(value)
  const seen = new Set()
  const repeated = new Set()
  for (let index = 0; index <= tokens.length - size; index += 1) {
    const ngram = tokens.slice(index, index + size).join(" ")
    if (seen.has(ngram)) {
      repeated.add(ngram)
    } else {
      seen.add(ngram)
    }
  }
  return Array.from(repeated)
}

export function meaningfulRepeatedNgrams(value, size = 4) {
  return detectRepeatedNgrams(value, size).filter((ngram) => {
    const meaningfulTokens = ngram
      .split(" ")
      .filter(token => token.length > 2 && !REPETITION_STOP_WORDS.has(token))
    return new Set(meaningfulTokens).size >= 2
  })
}

export function lexicalVariety(value) {
  const tokens = toTokens(value)
  if (tokens.length === 0) return 0
  return new Set(tokens).size / tokens.length
}

export function collectStyleIssues({
  text,
  includeShellWarnings = false,
}) {
  const issues = []
  if (countPatternMatches(text, PLACEHOLDER_PATTERNS) > 0) {
    issues.push("contains placeholder text")
  }
  if (countPatternMatches(text, HARD_BANNED_PATTERNS) > 0) {
    issues.push("contains banned overreach or generic reassurance")
  }
  if (countPatternMatches(text, WEAK_COPY_PATTERNS) > 0) {
    issues.push("leans on template-heavy phrasing")
  }
  if (averageSentenceLength(text) > 24) {
    issues.push("runs too long at the sentence level")
  }
  if (includeShellWarnings && countPatternMatches(text, SHELL_COPY_WARNING_PATTERNS) > 0) {
    issues.push("slides toward brand language instead of direct guidance")
  }
  return issues
}
