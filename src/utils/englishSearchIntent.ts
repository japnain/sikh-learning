export interface EnglishSearchIntentPlan {
  /** The user's words after removing a recognized question wrapper, if present. */
  literalQuery: string
  /** Literal query first; optional alternatives are retrieval suggestions only. */
  terms: string[]
  topicLabel?: string
  correctedFrom?: string
  isNaturalLanguage: boolean
}

interface SearchTopic {
  label: string
  terms: readonly string[]
  aliases?: readonly string[]
}

// Lexical retrieval alternatives, not definitions or interpretations of Gurbani.
// Related words are deliberately visible in the plan so callers can disclose
// the expansion and let people return to their literal query.
const TOPICS: readonly SearchTopic[] = [
  { label: 'Worry and anxiety', terms: ['worry', 'anxiety', 'anxious'], aliases: ['worried', 'worries'] },
  { label: 'Anger', terms: ['anger', 'wrath', 'rage'], aliases: ['angry', 'wrathful', 'enraged'] },
  { label: 'Grief and sorrow', terms: ['grief', 'sorrow', 'sadness'], aliases: ['grieving', 'sad', 'mourning'] },
  { label: 'Compassion', terms: ['compassion', 'mercy', 'kindness'], aliases: ['compassionate', 'merciful', 'kind'] },
  { label: 'Humility', terms: ['humility', 'humble', 'meekness'], aliases: ['meek'] },
  { label: 'Gratitude', terms: ['gratitude', 'thankfulness', 'thanks'], aliases: ['grateful', 'thankful', 'gratefulness'] },
  { label: 'Courage', terms: ['courage', 'bravery', 'boldness'], aliases: ['courageous', 'brave', 'bold'] },
  { label: 'Equality', terms: ['equality', 'equal', 'impartiality'], aliases: ['equally', 'impartial'] },
  { label: 'Service', terms: ['service', 'serve', 'serving'] },
  { label: 'Ego and pride', terms: ['ego', 'pride', 'egotism'], aliases: ['egoism', 'egotistical'] },
  { label: 'Attachment', terms: ['attachment', 'clinging', 'attached'] },
  { label: 'Forgiveness', terms: ['forgiveness', 'forgive', 'pardon'], aliases: ['forgiving', 'forgiven'] },
  { label: 'Truth', terms: ['truth', 'truthfulness', 'true'], aliases: ['truthful'] },
  { label: 'Peace', terms: ['peace', 'tranquility', 'calm'], aliases: ['peaceful', 'tranquillity', 'tranquil', 'calmness'] },
  { label: 'Death', terms: ['death', 'dying', 'mortality'] },
  { label: 'Trust and faith', terms: ['trust', 'faith', 'confidence'], aliases: ['trusting', 'faithful'] },
  { label: 'Joy', terms: ['joy', 'happiness', 'delight'], aliases: ['joyful', 'happy', 'delighted'] },
  { label: 'Contentment', terms: ['contentment', 'content', 'satisfaction'], aliases: ['contented', 'satisfied'] },
  { label: 'Love', terms: ['love', 'affection', 'loving'], aliases: ['affectionate'] },
  { label: 'Hope', terms: ['hope', 'hopeful', 'hopes'] },
  { label: 'Greed', terms: ['greed', 'avarice', 'covetousness'], aliases: ['greedy', 'avaricious', 'covetous'] },
  { label: 'Patience', terms: ['patience', 'forbearance', 'patient'] },
  { label: 'Wisdom', terms: ['wisdom', 'wise', 'understanding'] },
  { label: 'Loneliness', terms: ['loneliness', 'lonely', 'solitude'] },
]

const TOPIC_BY_WORD = new Map(TOPICS.flatMap(topic =>
  [...topic.terms, ...(topic.aliases ?? [])].map(word => [word, topic] as const)))

// An allowlist avoids changing real words such as "piece", "price", "live",
// "grave" or "thrust" merely because they resemble a theme.
const TYPO_CORRECTIONS: Readonly<Record<string, string>> = {
  anxity: 'anxiety', anxeity: 'anxiety', anixety: 'anxiety', anxietty: 'anxiety', anxety: 'anxiety', axiety: 'anxiety',
  angre: 'anger', annger: 'anger',
  compasion: 'compassion', compasison: 'compassion', compasssion: 'compassion',
  humilty: 'humility', humiltiy: 'humility', humillity: 'humility',
  gratitiude: 'gratitude', gratitide: 'gratitude', gratefullness: 'gratefulness',
  courrage: 'courage', courge: 'courage', couarge: 'courage',
  eqaulity: 'equality', equailty: 'equality', equlity: 'equality',
  forgivness: 'forgiveness', forgivenss: 'forgiveness', forgivnesss: 'forgiveness',
  attachement: 'attachment', atachment: 'attachment',
  contetment: 'contentment', contentmant: 'contentment', contement: 'contentment',
  sorow: 'sorrow', sorro: 'sorrow',
  peacee: 'peace', peece: 'peace',
  hapiness: 'happiness', happines: 'happiness', happyness: 'happiness',
  patince: 'patience', paitence: 'patience', patienc: 'patience',
  wisdon: 'wisdom', wisdome: 'wisdom',
  lonliness: 'loneliness', lonelyness: 'loneliness',
  truht: 'truth', turth: 'truth', servce: 'service', sevice: 'service',
}

const SCRIPTURE = '(?:gurbani|(?:sri\\s+)?guru\\s+granth\\s+sahib(?:\\s+ji)?|sikh\\s+teachings)'
const PASSAGE = '(?:shabads?|verses?|lines?|passages?|quotes?)'
const WRAPPERS = [
  new RegExp(`^(?:please\\s+)?what\\s+(?:does|do)\\s+${SCRIPTURE}\\s+(?:say|teach)(?:\\s+us)?\\s+about\\s+(.+)$`, 'i'),
  new RegExp(`^(?:please\\s+)?(?:find|show|give)(?:\\s+me)?\\s+(?:${SCRIPTURE}(?:\\s+${PASSAGE})?|${PASSAGE}(?:\\s+(?:from|in)\\s+${SCRIPTURE})?)\\s+(?:about|on|for|regarding|related\\s+to)\\s+(.+)$`, 'i'),
  new RegExp(`^${SCRIPTURE}(?:\\s+${PASSAGE})?\\s+(?:about|on|for|regarding|related\\s+to)\\s+(.+)$`, 'i'),
  new RegExp(`^${PASSAGE}\\s+(?:from|in)\\s+${SCRIPTURE}\\s+(?:about|on|for|regarding)\\s+(.+)$`, 'i'),
]

const PROCESS_WRAPPER = /^(?:(?:how\s+(?:(?:can|do|should)\s+(?:i|we|one)|to)\s+)?(?:overcome|overcoming|deal\s+with|dealing\s+with|manage|managing|find|finding|develop|developing|cultivate|cultivating|practice|practise)|help\s+(?:me\s+)?with)\s+(.+?)(?:\s+(?:through|in|according\s+to)\s+gurbani)?$/i
const NEGATION = /\b(?:no|not|never|without|neither|nor|cannot|none|nothing|nobody|nowhere|hardly|scarcely|barely|avoid|avoiding|stop|stopping|less|dont|doesnt|isnt|arent|wasnt|werent|cant|wont|shouldnt|wouldnt|couldnt)\b|n['’]t\b|(?:^|\s)-[a-z]/i
const QUOTED_SYNTAX = /["“”]|(?:^|\s)['‘].+['’](?:$|\s|[?!.,])/u

function unexpanded(literalQuery: string, isNaturalLanguage = false): EnglishSearchIntentPlan {
  return { literalQuery, terms: literalQuery ? [literalQuery] : [], isNaturalLanguage }
}

function correctedWord(value: string) {
  const lower = value.toLowerCase()
  return Object.prototype.hasOwnProperty.call(TYPO_CORRECTIONS, lower) ? TYPO_CORRECTIONS[lower] : lower
}

/** Plan a small, inspectable English retrieval query without AI or a network call. */
export function planEnglishSearchIntent(query: string): EnglishSearchIntentPlan {
  const original = query.trim()
  // Refuse to infer intent from excessive, mixed-script or empty input. Do not
  // truncate: that could remove a late negation or part of a quoted phrase.
  if (!original || original.length > 240 || /[^\p{ASCII}\u2018-\u201D]/u.test(original)) return unexpanded(original)

  let literalQuery = original
  let isNaturalLanguage = false
  for (const wrapper of WRAPPERS) {
    const match = literalQuery.match(wrapper)
    if (!match) continue
    literalQuery = match[1].replace(/[?!]+$/g, '').trim()
    isNaturalLanguage = true
    break
  }

  // Quotation is an explicit request for those words. Preserve its contents,
  // spacing and delimiters; the retrieval layer decides exact phrase matching.
  if (QUOTED_SYNTAX.test(literalQuery)) return unexpanded(literalQuery, isNaturalLanguage)
  literalQuery = literalQuery.replace(/\s+/g, ' ')
  if (NEGATION.test(literalQuery)) return unexpanded(literalQuery, isNaturalLanguage)

  const process = literalQuery.replace(/[?!]+$/g, '').match(PROCESS_WRAPPER)
  if (process) {
    const candidate = process[1].replace(/[?!]+$/g, '').trim()
    // Only remove process language around a known single theme. Multi-topic
    // questions and arbitrary phrases retain all their meaning-bearing words.
    if (TOPIC_BY_WORD.has(correctedWord(candidate))) {
      literalQuery = candidate
      isNaturalLanguage = true
    }
  }

  const corrected = correctedWord(literalQuery)
  const topic = TOPIC_BY_WORD.get(corrected)
  if (!topic) return unexpanded(literalQuery, isNaturalLanguage)
  const correctedFrom = corrected !== literalQuery.toLowerCase() ? literalQuery : undefined
  if (correctedFrom) literalQuery = corrected
  const terms = [literalQuery, ...topic.terms.filter(term => term !== literalQuery.toLowerCase())].slice(0, 3)
  return { literalQuery, terms, topicLabel: topic.label, ...(correctedFrom ? { correctedFrom } : {}), isNaturalLanguage }
}
