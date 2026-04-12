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
  "read",
  "name",
  "notice",
  "refuse",
  "release",
  "return",
  "let",
  "choose",
  "guard",
  "wait",
  "receive",
  "practice",
  "bring",
  "listen",
  "stop",
]

export const BEAUTY_SIGNALS = [
  "mercy",
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
  "today",
  "day",
  "before",
  "after",
  "when",
  "one",
  "next",
  "room",
  "mouth",
  "tongue",
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

export function normalizeEditorialText(value) {
  return value
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
  if (detectRepeatedNgrams(text).length > 2) {
    issues.push("repeats phrasing too closely")
  }
  if (includeShellWarnings && countPatternMatches(text, SHELL_COPY_WARNING_PATTERNS) > 0) {
    issues.push("slides toward brand language instead of direct guidance")
  }
  return issues
}
