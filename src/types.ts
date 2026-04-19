export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'degraded'
export type AsyncIssueCode = 'qa-fault' | 'missing' | 'offline' | 'unavailable'

export interface AsyncIssue {
  code: AsyncIssueCode
  detail?: string | null
}

export interface MahanKoshEntry {
  id: number
  word: string
  searchKey: string
  transliteration: string
  roman: string
  hindi: string
  description: string
  description_hi: string
  exactMatch: boolean
  sourceUrl: string
}

export interface MahanKoshEnglishGloss {
  gloss: string
  source: 'bdb' | 'generated'
}

export type EnglishSource = 'bdb' | 'ms' | 'ssk'
export type PunjabiSource = 'ss' | 'ft' | 'bdb' | 'ms' | 'pss' | (string & {})
export type HindiSource = 'ss' | 'sts' | (string & {})
export type VisraamSource = 'sttm' | 'igurbani' | 'sttm2'
export type ScriptMode = 'gurmukhi' | 'devanagari'
export type MeaningLanguage = 'none' | 'en' | 'pa' | 'hi'
export type ReaderLineSpacing = 'compact' | 'relaxed'
export type ReaderAlignment = 'left' | 'center'
export type SundarGutkaLength = 'short' | 'medium' | 'long' | 'extralong'
export type SearchMode =
  | 'first-letters'
  | 'first-letters-anywhere'
  | 'gurmukhi'
  | 'english'
  | 'transliteration'
  | 'ang'
  | 'auto-detect'
export type LearningLevel = 'beginner' | 'familiar' | 'daily-reader'
export type VocabKind = 'word' | 'phrase'
export type UiLocale = 'en' | 'pa' | 'hi'
export type OnboardingAudience = 'child' | 'teen' | 'adult'
export type LearningGoal = 'read' | 'understand' | 'habit'
export type OnboardingPresentationMode = 'first-run' | 'overlay'
export type LearningSkillKind = 'symbol' | 'sound' | 'pattern' | 'guided-reading' | 'comprehension'
export type GuidedJourneyStepType = 'learn' | 'guided' | 'study' | 'review'
export type SoundCategory = 'rain' | 'water' | 'wind' | 'night' | 'sanctuary'
export type FocusContext = 'learn' | 'study' | 'review'
export type FocusPresetId = 'settle' | 'focus' | 'night'
export type SupportDensity = 'full' | 'guided' | 'light' | 'minimal'
export type LearnProgramId = 'start-reading' | 'build-fluency' | 'understand-gurbani' | 'deep-study'
export type LearnModuleType = 'symbol' | 'sound' | 'decode' | 'guided' | 'meaning' | 'compare' | 'review' | 'grammar' | 'word-family'
export type LearnActivityContext = 'learn' | 'study' | 'review'
export type PlacementConfidence = 'gentle' | 'steady' | 'immersed'
export type DailyLessonStepKind = 'vocab-review' | 'module' | 'quick-connect' | 'grammar-note' | 'word-family'
export type MilestoneId = string

export interface EnglishTranslations {
  bdb?: string
  ms?: string
  ssk?: string
}

export type PunjabiTranslations = Record<string, string>
export type HindiTranslations = Record<string, string>

export interface ScriptureVisraamMarker {
  p: number
  t: string
}

export type ScriptureVisraamSets = Partial<Record<VisraamSource, ScriptureVisraamMarker[]>>

export interface ScriptureSourceMeta {
  sourceId?: string | null
  gurmukhi?: string
  unicode?: string
  english?: string
  pageNo?: number | null
}

export interface ScriptureRaagMeta {
  raagId?: number | null
  gurmukhi?: string
  unicode?: string
  english?: string
  raagWithPage?: string
}

export interface ScriptureWriterMeta {
  writerId?: number | null
  gurmukhi?: string
  unicode?: string
  english?: string
}

export interface ScriptureLine {
  verseId: number
  shabadId: number
  ang: number
  originalAng?: number | null
  isHeader?: boolean
  gurmukhi: string
  larivaar?: string
  transliteration: string
  translation_en: string
  translations_en: EnglishTranslations
  translation_hi: string
  translations_hi?: HindiTranslations
  translation_pa: string
  translations_pa?: PunjabiTranslations
  visraam?: ScriptureVisraamSets
}

export interface ScriptureEntry {
  id: string
  scripture: string
  ang: number
  source?: 'G' | 'D' | 'B' | 'A'
  shabadId?: number
  verseIds?: number[]
  sourceName?: string
  sourceMeta?: ScriptureSourceMeta | null
  raag?: string
  raagMeta?: ScriptureRaagMeta | null
  writer?: string
  writerMeta?: ScriptureWriterMeta | null
  hukamnamaDate?: string
  lines?: ScriptureLine[]
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_hi: string
  translation_pa: string
  words: Word[]
}

export interface VocabEntry {
  kind?: VocabKind
  word: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
  scripture: string
  sourceId: string
  savedAt: string
  context?: VocabContext
  review?: VocabReviewState
}

export interface StudiedEntry {
  id: string
  swipedAt: string
}

export interface Scripture {
  id: string
  name: string
  shortName: string
  sourceId: 'G' | 'D' | 'B' | 'A'
}

export interface BanidbKoshWord {
  id: number
  word: string
  wordUni: string
}

export interface BanidbKoshDefinition extends BanidbKoshWord {
  definition: string
  definitionUni: string
}

export interface RehatSummary {
  rehatId: number
  rehatName: string
  alphabet: string
}

export interface RehatChapterSummary {
  chapterId: number
  chapterName: string
  alphabet: string
}

export interface RehatChapterContent {
  rehatId: number
  chapterId: number
  chapterName: string
  chapterContent: string
  alphabet: string
}

export interface VocabContext {
  scripture: string
  sourceId: string
  ang?: number
  shabadId?: number
  verseId?: number
  line?: string
}

export interface VocabReviewState {
  dueAt: string
  intervalDays: number
  reviewCount: number
  lastReviewedAt?: string
}

export interface LearningProgressState {
  masteredSymbols: string[]
  completedLessons: string[]
  practiceStreak: number
  lastPracticedOn?: string
  totalPracticeSessions: number
  streakCalendar?: Record<string, boolean>
  longestStreak?: number
  earnedMilestoneIds?: MilestoneId[]
  pendingMilestoneId?: MilestoneId | null
  dailyLesson?: DailyLesson | null
  grammarNotesSeen?: string[]
  masteredWordFamilyIds?: string[]
  themePathProgress?: Record<string, ThemePathProgress>
  completedThemePathIds?: string[]
  skills?: Record<string, LearningSkillProgress>
  lessonProgress?: Record<string, LearningLessonProgress>
  assessmentHistory?: LearningAssessmentRecord[]
  journeys?: Record<string, GuidedJourneyProgress>
  activeJourneyId?: string | null
  activeProgramId?: LearnProgramId
  programProgress?: Record<LearnProgramId, LearnProgramProgress>
  queuedReviewModuleIds?: string[]
  placementResult?: LearnPlacementResult | null
  lastLearnActivity?: LearnActivity | null
  learnState?: UserLearningState
}

export interface LearnProgram {
  id: LearnProgramId
  name: string
  eyebrow: string
  description: string
  outcome: string
  defaultSupportDensity: SupportDensity
}

export interface LearnCompareRow {
  label: string
  text: string
}

export interface LearnModuleOption {
  id: string
  label: string
  detail?: string
}

export interface LearnModule {
  id: string
  programId: LearnProgramId
  type: LearnModuleType
  title: string
  summary: string
  scriptureAnchor?: string
  source?: 'G' | 'D'
  ang?: number
  estimatedMinutes: number
  supportDensity: SupportDensity
  skillIds: string[]
  prerequisiteIds: string[]
  relatedReviewIds: string[]
  prompt?: string
  focus?: string
  supportHint?: string
  keywords?: string[]
  symbolGroups?: string[][]
  parts?: string[]
  combined?: string
  transliteration?: string
  meaning?: string
  scriptText?: string
  options?: LearnModuleOption[]
  answerId?: string
  explanation?: string
  compareRows?: LearnCompareRow[]
  note?: string
  relatedJourneyIds?: string[]
  grammarPattern?: string
  grammarExamples?: Array<{ gurmukhi: string; transliteration: string; meaning: string; highlight?: string }>
  grammarNoteId?: string
  wordFamilyId?: string
  wordFamilyRoot?: string
  wordFamilyMembers?: Array<{ gurmukhi: string; transliteration: string; meaning: string }>
}

export interface LearnProgramProgress {
  currentModuleId: string | null
  completedModuleIds: string[]
  lastActivityAt?: string
}

export interface LearnPlacementResult {
  confidence: PlacementConfidence
  readingScore: number
  meaningScore: number
  programId: LearnProgramId
  supportDensity: SupportDensity
  placedAt: string
}

export interface LearnActivity {
  programId: LearnProgramId
  moduleId: string
  context: LearnActivityContext
  visitedAt: string
}

export interface FocusPreset {
  id: FocusPresetId
  name: string
  description: string
  soundId: string
  recommendedContexts: FocusContext[]
  defaultVolume: number
}

export interface LearningBridgeItem {
  id: string
  title: string
  scripture: string
  source: 'G' | 'D'
  ang: number
  gurmukhi: string
  transliteration: string
  meaning: string
  focus: string
}

export interface LearningSkillProgress {
  kind: LearningSkillKind
  mastery: number
  attempts: number
  successes: number
  lastReviewedOn?: string
}

export interface LearningLessonProgress {
  attempts: number
  bestScore: number
  completedAt?: string
  lastPracticedAt?: string
}

export interface LearningAssessmentRecord {
  lessonId: string
  score: number
  skillIds: string[]
  recordedAt: string
}

export interface Milestone {
  id: MilestoneId
  title: string
  gurmukhi?: string
  description: string
  earnedMessage: string
}

export interface DailyLessonStep {
  id: string
  kind: DailyLessonStepKind
  title: string
  estimatedSeconds: number
  body?: string
  moduleId?: string
  vocabWords?: string[]
  grammarNoteId?: string
  wordFamilyId?: string
  source?: 'G' | 'D'
  ang?: number
  baniTitle?: string
  gurmukhi?: string
  transliteration?: string
  meaning?: string
}

export interface DailyLesson {
  date: string
  steps: DailyLessonStep[]
  completedStepIds: string[]
  generatedAt: string
  totalEstimatedSeconds: number
}

export interface GrammarNote {
  id: string
  title: string
  pattern: string
  examples: Array<{
    gurmukhi: string
    transliteration: string
    meaning: string
    sourceAng?: number
  }>
  explanation: string
  relatedSkillIds: string[]
  programLevel: LearnProgramId
}

export interface WordFamily {
  id: string
  root: string
  rootTransliteration: string
  rootMeaning: string
  theme: string
  members: Array<{
    gurmukhi: string
    transliteration: string
    meaning: string
    exampleLine?: string
    exampleAng?: number
  }>
  relatedThemePathId?: string
}

export interface ThemePath {
  id: string
  title: string
  subtitle: string
  description: string
  themeTag: string
  moduleIds: string[]
  wordFamilyIds: string[]
  minimumProgramId: LearnProgramId
}

export interface ThemePathProgress {
  startedAt: string
  completedModuleIds: string[]
}

export interface FoundationModule {
  id: string
  title: string
  summary: string
  focus: string
  lessonIds: string[]
  symbolGroups: string[][]
}

export interface PhonicsDrill {
  id: string
  title: string
  prompt: string
  answer: string
  contrast: string
  explanation: string
  skillIds: string[]
}

export interface DecodingDrill {
  id: string
  title: string
  parts: string[]
  combined: string
  transliteration: string
  meaning: string
  skillIds: string[]
}

export interface GuidedReadingExercise {
  id: string
  title: string
  scripture: string
  source: 'G' | 'D'
  ang: number
  gurmukhi: string
  transliteration: string
  meaning: string
  supportHint: string
  keywords: string[]
  skillIds: string[]
}

export interface ComprehensionExercise {
  id: string
  guidedExerciseId: string
  question: string
  options: string[]
  answer: string
  explanation: string
  skillIds: string[]
}

export interface GuidedJourneyStep {
  id: string
  title: string
  detail: string
  type: GuidedJourneyStepType
  track?: 'foundations' | 'phonics' | 'decoding' | 'guided' | 'comprehension'
  lessonId?: string
  guidedExerciseId?: string
  source?: 'G' | 'D'
  ang?: number
  baniTitle?: string
}

export interface GuidedJourney {
  id: string
  programId?: LearnProgramId
  title: string
  subtitle: string
  description: string
  source: 'G' | 'D'
  startAng: number
  steps: GuidedJourneyStep[]
}

export interface GuidedJourneyProgress {
  startedAt: string
  completedStepIds: string[]
  lastTouchedAt: string
  completedAt?: string
}

export type LearnTab = 'today' | 'topics' | 'shabads' | 'saved'
export type LearnDepthPreference = 'gentle' | 'balanced' | 'deep'
export type LearnContentKind = 'daily-guidance' | 'shabad-deep-dive' | 'topic-guide' | 'collection'
export type LearnDifficulty = 'beginner' | 'growing' | 'deep'
export type LearnFreshnessTier = 'fresh' | 'evergreen' | 'reserve'
export type TopicScenarioKey = 'overview' | 'daily' | 'pressure' | 'repair' | 'practice'
export type LearnBalanceCategory =
  | 'comfort'
  | 'challenge'
  | 'discipline'
  | 'gratitude'
  | 'hukam'
  | 'seva'
  | 'reflection'

export interface SourceCitation {
  scripture: 'SGGS'
  shabad_id: number
  ang: number
  guru: string
  raag: string
  line_range: [number, number]
  verse_ids: number[]
  translator: string
}

export interface RotationMetadata {
  theme: string
  depthLevel: LearnDifficulty
  cooldownWindowDays: number
  seasonality: string[]
  priority: number
  freshnessTier: LearnFreshnessTier
  balanceCategory: LearnBalanceCategory
}

export interface LearnSourceLine {
  verseId: number
  gurmukhi: string
  transliteration: string
  translation: string
}

export interface LearnLineReference {
  deepDiveId: string
  verseIds: number[]
  shortMeaning: string
  lifeApplication: string
}

export type LearnEditorialStatus = 'draft' | 'approved' | 'locked' | 'theme-mismatch'

export interface LearnEditorialEvidence {
  coreClaim: string
  emotionalState: string
  turn: string
  practicalImplication: string
  bannedOverreach: string[]
}

export interface LearnEditorialScores {
  faithfulness: number
  clarity: number
  specificity: number
  emotionalHonesty: number
  usefulness: number
  beauty: number
  overall: number
}

export interface LearnEditorialAssessment {
  status: LearnEditorialStatus
  origin: 'legacy' | 'generated' | 'manual'
  voiceVersion: string
  templateKey: string
  evidence: LearnEditorialEvidence
  scores: LearnEditorialScores
  strengths: string[]
  issues: string[]
  reviewedByHuman?: boolean
}

export interface LearnLineReferenceOverride {
  shortMeaning?: string
  lifeApplication?: string
}

export interface TopicGuideExcerptOverride {
  source?: LearnLineReferenceOverride
  explanation?: string
}

export interface GuidanceOverridePayload {
  title?: string
  summary?: string
  takeaway?: string
  lifeApplication?: string
  rotationTheme?: string
  source?: LearnLineReferenceOverride
  reviewedByHuman: boolean
  forcedLocked?: boolean
}

export interface ShabadOverridePayload {
  title?: string
  summary?: string
  whyItMatters?: string
  takeaway?: string
  structure?: string[]
  reviewedByHuman: boolean
  forcedLocked?: boolean
}

export interface TopicOverridePayload {
  title?: string
  shortTitle?: string
  issueStatement?: string
  centralInsight?: string
  practicalReflection?: string
  actionPrompt?: string
  excerpts?: TopicGuideExcerptOverride[]
  reviewedByHuman: boolean
  forcedLocked?: boolean
}

export interface ScenarioOverridePayload {
  title?: string
  issueStatement?: string
  centralInsight?: string
  practicalReflection?: string
  actionPrompt?: string
  excerpts?: TopicGuideExcerptOverride[]
  reviewedByHuman: boolean
  forcedLocked?: boolean
}

export interface CollectionOverridePayload {
  title?: string
  subtitle?: string
  description?: string
  heroSource?: LearnLineReferenceOverride
  reviewedByHuman: boolean
  forcedLocked?: boolean
}

export interface DailyGuidance {
  id: string
  title: string
  summary: string
  takeaway: string
  lifeApplication: string
  source: LearnLineReference
  relatedTopicIds: string[]
  relatedShabadIds: string[]
  relatedCollectionIds: string[]
  rotation: RotationMetadata
  editorial?: LearnEditorialAssessment
}

export interface ShabadDeepDive {
  id: string
  title: string
  subtitle: string
  summary: string
  whyItMatters: string
  takeaway: string
  themes: string[]
  emotionalStates: string[]
  difficulty: LearnDifficulty
  estimatedMinutes: number
  lengthBand: 'short' | 'medium' | 'long'
  citation: SourceCitation
  lines: LearnSourceLine[]
  structure: string[]
  keyVerseIds: number[]
  relatedGuidanceIds: string[]
  relatedTopicIds: string[]
  relatedCollectionIds: string[]
  rotation: RotationMetadata
  editorial?: LearnEditorialAssessment
}

export interface TopicGuideExcerpt {
  source: LearnLineReference
  explanation: string
}

export interface TopicScenario {
  key: Exclude<TopicScenarioKey, 'overview'>
  label: string
  title: string
  issueStatement: string
  centralInsight: string
  practicalReflection: string
  actionPrompt: string
  searchTerms: string[]
  excerpts: TopicGuideExcerpt[]
  editorial?: LearnEditorialAssessment
}

export interface TopicGuide {
  id: string
  title: string
  shortTitle: string
  category: 'most-needed' | 'inner-work' | 'practice'
  issueStatement: string
  centralInsight: string
  practicalReflection: string
  actionPrompt: string
  searchTerms: string[]
  excerpts: TopicGuideExcerpt[]
  defaultScenarioKey: TopicScenarioKey
  scenarioOrder: Array<Exclude<TopicScenarioKey, 'overview'>>
  scenarios: Record<Exclude<TopicScenarioKey, 'overview'>, TopicScenario>
  relatedShabadIds: string[]
  relatedTopicIds: string[]
  relatedCollectionIds: string[]
  rotation: RotationMetadata
  editorial?: LearnEditorialAssessment
}

export interface CollectionItemReference {
  kind: Exclude<LearnContentKind, 'collection'>
  id: string
  scenarioKey?: Exclude<TopicScenarioKey, 'overview'>
}

export interface Collection {
  id: string
  title: string
  subtitle: string
  description: string
  durationLabel: string
  themes: string[]
  heroSource: LearnLineReference
  items: CollectionItemReference[]
  relatedTopicIds: string[]
  relatedShabadIds: string[]
  editorial?: LearnEditorialAssessment
}

export type LearnHomeDailyGuidance = Pick<
  DailyGuidance,
  | 'id'
  | 'title'
  | 'summary'
  | 'relatedTopicIds'
  | 'relatedShabadIds'
  | 'relatedCollectionIds'
  | 'rotation'
>

export type LearnHomeShabadDeepDive = Pick<
  ShabadDeepDive,
  | 'id'
  | 'title'
  | 'subtitle'
  | 'summary'
  | 'whyItMatters'
  | 'themes'
  | 'relatedGuidanceIds'
  | 'relatedTopicIds'
  | 'relatedCollectionIds'
  | 'rotation'
>

export type LearnHomeTopicGuide = Pick<
  TopicGuide,
  | 'id'
  | 'title'
  | 'shortTitle'
  | 'category'
  | 'centralInsight'
  | 'searchTerms'
  | 'relatedTopicIds'
  | 'relatedShabadIds'
  | 'relatedCollectionIds'
  | 'rotation'
>

export type LearnHomeCollection = Pick<
  Collection,
  | 'id'
  | 'title'
  | 'subtitle'
  | 'description'
  | 'durationLabel'
  | 'themes'
  | 'relatedTopicIds'
  | 'relatedShabadIds'
> & {
  itemCount: number
}

export interface LearnHomeCatalogPayload {
  dailyGuidance: LearnHomeDailyGuidance[]
  shabadDeepDives: LearnHomeShabadDeepDive[]
  topicGuides: LearnHomeTopicGuide[]
  collections: LearnHomeCollection[]
}

export interface LearnHomeCatalog extends LearnHomeCatalogPayload {
  dailyGuidanceById: Record<string, LearnHomeDailyGuidance>
  shabadDeepDiveById: Record<string, LearnHomeShabadDeepDive>
  topicGuideById: Record<string, LearnHomeTopicGuide>
  collectionById: Record<string, LearnHomeCollection>
}

export interface LearnItemView {
  itemId: string
  kind: LearnContentKind
  viewedAt: string
}

export interface UserLearningState {
  viewedItems: LearnItemView[]
  savedItemIds: string[]
  recentTopicIds: string[]
  activeCollectionId: string | null
  depthPreference: LearnDepthPreference
}

export interface LearnTopicSearchEntry {
  id: string
  title: string
  shortTitle: string
  searchTerms: string[]
}

export interface LearnTopicSearchTarget {
  topicId: string
  scenarioKey?: Exclude<TopicScenarioKey, 'overview'>
}

export interface LearnInventorySummary {
  dailyGuidance: number
  shabadDeepDives: number
  topicGuides: number
  topicScenarios: number
  collections: number
  crossLinks: number
  readyForLaunch: boolean
}

export interface LearnContentTargets {
  dailyGuidance: number
  shabadDeepDives: number
  topicGuides: number
  topicScenarios: number
  collections: number
  crossLinks: number
  averageCrossLinksPerItem: number
}

export interface LearnSearchIndex {
  synonyms: Record<string, LearnTopicSearchTarget>
  legacyTopicAliases: Record<string, LearnTopicSearchTarget>
  topics: LearnTopicSearchEntry[]
}

export interface LearnValidationReport {
  generatedAt: string
  counts: LearnInventorySummary
  averageCrossLinksPerItem: number
  editorial: {
    voiceVersion: string
    statuses: Record<LearnEditorialStatus, number>
    draftCount: number
    lowScoringItems: Array<{
      id: string
      kind: LearnContentKind
      status: LearnEditorialStatus
      overall: number
      issues: string[]
    }>
    duplicateWarnings: string[]
  }
  hardFailures: string[]
  warnings: string[]
}

export interface LearnManifest {
  version: string
  generatedAt: string
  inventory: LearnInventorySummary
  targets: LearnContentTargets
  filters: {
    shabadThemes: string[]
    shabadGurus: string[]
    shabadRaags: string[]
  }
  searchIndexPath: string
  listPaths: {
    dailyGuidance: string
    shabadDeepDives: string
    topicGuides: string
    collections: string
  }
  detailPathTemplate: Record<LearnContentKind, string>
  validationReportPath: string
}

export interface LearnCatalog {
  manifest: LearnManifest
  searchIndex: LearnSearchIndex
  dailyGuidance: DailyGuidance[]
  shabadDeepDives: ShabadDeepDive[]
  topicGuides: TopicGuide[]
  collections: Collection[]
  dailyGuidanceById: Record<string, DailyGuidance>
  shabadDeepDiveById: Record<string, ShabadDeepDive>
  topicGuideById: Record<string, TopicGuide>
  collectionById: Record<string, Collection>
}
