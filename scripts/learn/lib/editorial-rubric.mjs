import {
  ACTION_VERBS,
  BEAUTY_SIGNALS,
  CONCRETE_SIGNALS,
  HARD_BANNED_PATTERNS,
  PLACEHOLDER_PATTERNS,
  WEAK_COPY_PATTERNS,
  averageSentenceLength,
  collectStyleIssues,
  countKeywordOverlap,
  countPatternMatches,
  lexicalVariety,
  meaningfulRepeatedNgrams,
  normalizeEditorialText,
  splitSentences,
  toTokens,
} from "./style-guide.mjs"

function clampScore(value) {
  return Math.max(0, Math.min(5, Number(value.toFixed(2))))
}

function topStrengths(scores) {
  return Object.entries(scores)
    .filter(([key]) => key !== "overall")
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([key]) => key)
}

function inferIssues({
  combined,
  practicalImplication,
  evidence,
}) {
  const issues = collectStyleIssues({ text: combined })
  if (countPatternMatches(combined, PLACEHOLDER_PATTERNS) > 0) {
    issues.push("still reads like an unfinished draft")
  }
  if (countPatternMatches(combined, HARD_BANNED_PATTERNS) > 0) {
    issues.push("makes claims the cited lines do not support")
  }
  if (countPatternMatches(combined, WEAK_COPY_PATTERNS) > 0) {
    issues.push("sounds interchangeable with other generated entries")
  }
  if (!practicalImplication || splitSentences(practicalImplication).length === 0) {
    issues.push("does not land in a usable next step")
  }
  if (!evidence.coreClaim || !evidence.turn || !evidence.practicalImplication) {
    issues.push("is missing explicit SGGS-grounded evidence")
  }
  return Array.from(new Set(issues))
}

export function scoreEditorialCopy({
  textBlocks,
  evidence,
}) {
  const combined = textBlocks.filter(Boolean).join(" ").trim()
  const practicalImplication = evidence.practicalImplication ?? ""
  const evidenceKeywords = Array.from(new Set([
    ...toTokens(evidence.coreClaim),
    ...toTokens(evidence.turn),
    ...toTokens(evidence.practicalImplication),
  ])).filter(token => token.length >= 4)

  const sentenceLength = averageSentenceLength(combined)
  const repeatedNgrams = meaningfulRepeatedNgrams(combined).length
  const evidenceOverlap = evidenceKeywords.length === 0
    ? 0
    : countKeywordOverlap(combined, evidenceKeywords) / evidenceKeywords.length
  const emotionalSignals = new Set([
    ...toTokens(evidence.emotionalState),
    "mind",
    "heart",
    "fear",
    "anger",
    "doubt",
    "pressure",
    "already",
    "still",
  ])
  const emotionOverlap = Array.from(emotionalSignals).filter(token => normalizeEditorialText(combined).includes(token)).length
  const concreteSignalCount = CONCRETE_SIGNALS.filter(token => normalizeEditorialText(practicalImplication).includes(token)).length
  const actionSignalCount = ACTION_VERBS.filter(token => normalizeEditorialText(practicalImplication).includes(token)).length
  const beautySignalCount = BEAUTY_SIGNALS.filter(token => normalizeEditorialText(combined).includes(token)).length
  const lexicalScore = lexicalVariety(combined)
  const weakPatternCount = countPatternMatches(combined, WEAK_COPY_PATTERNS)
  const hardBannedCount = countPatternMatches(combined, HARD_BANNED_PATTERNS)
  const placeholderCount = countPatternMatches(combined, PLACEHOLDER_PATTERNS)

  const faithfulness = clampScore(
    2.4
    + evidenceOverlap * 2
    - hardBannedCount * 1.4
    - placeholderCount * 1.4
  )
  const clarity = clampScore(
    4.35
    - Math.max(0, sentenceLength - 18) / 5
    - repeatedNgrams * 0.06
    - weakPatternCount * 0.1
  )
  const specificity = clampScore(
    2.2
    + evidenceOverlap * 1.9
    + Math.min(0.9, concreteSignalCount * 0.18)
    + Math.min(0.5, lexicalScore)
  )
  const emotionalHonesty = clampScore(
    3
    + Math.min(1, emotionOverlap * 0.18)
    - hardBannedCount * 1.1
  )
  const usefulness = clampScore(
    3
    + Math.min(1.5, actionSignalCount * 0.38)
    + Math.min(1.1, concreteSignalCount * 0.22)
    - weakPatternCount * 0.12
  )
  const beauty = clampScore(
    3.25
    + Math.min(0.9, beautySignalCount * 0.16)
    + Math.min(0.8, lexicalScore * 1.3)
    - repeatedNgrams * 0.04
    - weakPatternCount * 0.08
  )

  const scores = {
    faithfulness,
    clarity,
    specificity,
    emotionalHonesty,
    usefulness,
    beauty,
    overall: clampScore(
      faithfulness * 0.25
      + clarity * 0.15
      + specificity * 0.15
      + emotionalHonesty * 0.15
      + usefulness * 0.15
      + beauty * 0.15
    ),
  }

  return {
    scores,
    strengths: topStrengths(scores),
    issues: inferIssues({
      combined,
      practicalImplication,
      evidence,
    }),
  }
}
