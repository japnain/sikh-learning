import type {
  Collection,
  DailyGuidance,
  LearnContentKind,
  LearnLineReference,
  RotationMetadata,
  ShabadDeepDive,
  SourceCitation,
  TopicGuide,
} from "../types"

function citation(
  shabadId: number,
  ang: number,
  guru: string,
  raag: string,
  verseIds: number[]
): SourceCitation {
  return {
    scripture: "SGGS",
    shabad_id: shabadId,
    ang,
    guru,
    raag,
    line_range: [1, verseIds.length],
    verse_ids: verseIds,
    translator: "BaniDB English",
  }
}

function rotation(
  theme: string,
  depthLevel: RotationMetadata["depthLevel"],
  cooldownWindowDays: number,
  priority: number,
  balanceCategory: RotationMetadata["balanceCategory"],
  freshnessTier: RotationMetadata["freshnessTier"] = "evergreen"
): RotationMetadata {
  return {
    theme,
    depthLevel,
    cooldownWindowDays,
    priority,
    balanceCategory,
    freshnessTier,
    seasonality: ["evergreen"],
  }
}

function ref(
  deepDiveId: string,
  verseIds: number[],
  shortMeaning: string,
  lifeApplication: string
): LearnLineReference {
  return {
    deepDiveId,
    verseIds,
    shortMeaning,
    lifeApplication,
  }
}

export const LEARN_CONTENT_TARGETS = {
  dailyGuidance: 150,
  shabadDeepDives: 30,
  topicGuides: 40,
  collections: 12,
  crossLinks: 200,
} as const

export const LEARN_SEARCH_SYNONYMS: Record<string, string> = {
  stress: "topic-anxiety",
  overthinking: "topic-anxiety",
  worry: "topic-anxiety",
  panic: "topic-anxiety",
  anger: "topic-anger",
  frustration: "topic-anger",
  rage: "topic-anger",
  jealousy: "topic-comparison",
  envy: "topic-comparison",
  comparison: "topic-comparison",
  loneliness: "topic-loneliness",
  alone: "topic-loneliness",
  purpose: "topic-purpose",
  meaning: "topic-purpose",
  attachment: "topic-attachment",
  ego: "topic-ego",
  haumai: "topic-ego",
  gratitude: "topic-gratitude",
  discipline: "topic-discipline",
  seva: "topic-seva",
  service: "topic-seva",
  hukam: "topic-hukam",
}

export const SHABAD_DEEP_DIVES: ShabadDeepDive[] = [
  {
    id: "shabad-hukam-inside-everything",
    title: "Hukam Inside Everything",
    subtitle: "Japji Sahib, Pauri 2",
    summary: "This pauri reframes life from control to command. Everything is already moving inside Hukam.",
    whyItMatters: "It is a grounding shabad for anxiety, resistance, and the illusion that peace comes from managing every outcome.",
    takeaway: "Peace begins when the mind stops arguing with what already stands inside Hukam.",
    themes: ["hukam", "anxiety", "surrender"],
    emotionalStates: ["restless", "controlling", "uncertain"],
    difficulty: "beginner",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(2, 1, "Guru Nanak Dev Ji", "Jap", [11, 12, 13, 14, 15, 16]),
    lines: [
      {
        verseId: 11,
        gurmukhi: "ਹੁਕਮੀ ਹੋਵਨਿ ਆਕਾਰ ਹੁਕਮੁ ਨ ਕਹਿਆ ਜਾਈ ॥",
        transliteration: "hukamee hovan aakaar hukam na kahiaa jaiee ||",
        translation: "By His Command, bodies are created; His Command cannot be described.",
      },
      {
        verseId: 12,
        gurmukhi: "ਹੁਕਮੀ ਹੋਵਨਿ ਜੀਅ ਹੁਕਮਿ ਮਿਲੈ ਵਡਿਆਈ ॥",
        transliteration: "hukamee hovan jeea hukam milai vaddiaaiee ||",
        translation: "By His Command, souls come into being; by His Command, glory and greatness are obtained.",
      },
      {
        verseId: 13,
        gurmukhi: "ਹੁਕਮੀ ਉਤਮੁ ਨੀਚੁ ਹੁਕਮਿ ਲਿਖਿ ਦੁਖ ਸੁਖ ਪਾਈਅਹਿ ॥",
        transliteration: "hukamee utam neech hukam likh dhukh sukh paie'eeh ||",
        translation: "By His Command, some are high and some are low; by His Written Command, pain and pleasure are obtained.",
      },
      {
        verseId: 14,
        gurmukhi: "ਇਕਨਾ ਹੁਕਮੀ ਬਖਸੀਸ ਇਕਿ ਹੁਕਮੀ ਸਦਾ ਭਵਾਈਅਹਿ ॥",
        transliteration: "eikanaa hukamee bakhasees ik hukamee sadhaa bhavaie'eeh ||",
        translation: "Some, by His Command, are blessed and forgiven; others, by His Command, wander aimlessly forever.",
      },
      {
        verseId: 15,
        gurmukhi: "ਹੁਕਮੈ ਅੰਦਰਿ ਸਭੁ ਕੋ ਬਾਹਰਿ ਹੁਕਮ ਨ ਕੋਇ ॥",
        transliteration: "hukamai a(n)dhar sabh ko baahar hukam na koi ||",
        translation: "Everyone is subject to His Command; no one is beyond His Command.",
      },
      {
        verseId: 16,
        gurmukhi: "ਨਾਨਕ ਹੁਕਮੈ ਜੇ ਬੁਝੈ ਤ ਹਉਮੈ ਕਹੈ ਨ ਕੋਇ ॥੨॥",
        transliteration: "naanak hukamai je bujhai ta haumai kahai na koi ||2||",
        translation: "O Nanak, one who understands His Command, does not speak in ego. ||2||",
      },
    ],
    structure: [
      "Names Hukam as the frame around existence, not one force among many.",
      "Shows that pleasure, pain, status, and movement all unfold within that same reality.",
      "Closes by linking true understanding of Hukam with the softening of ego.",
    ],
    keyVerseIds: [11, 15, 16],
    relatedGuidanceIds: ["guidance-hukam", "guidance-one-giver"],
    relatedTopicIds: ["topic-anxiety", "topic-hukam", "topic-purpose"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("hukam", "beginner", 30, 9, "hukam"),
  },
  {
    id: "shabad-conquer-the-mind",
    title: "Conquer the Mind, Not the Room",
    subtitle: "Japji Sahib, Pauri 28",
    summary: "Guru Nanak redirects the spiritual struggle inward. Self-mastery matters more than external identity markers.",
    whyItMatters: "It speaks directly to scattered ambition, comparison, anger, and the urge to perform spirituality instead of being transformed by it.",
    takeaway: "The hardest field is the inner field. Win there first.",
    themes: ["discipline", "mind", "comparison"],
    emotionalStates: ["reactive", "performing", "scattered"],
    difficulty: "growing",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(28, 6, "Guru Nanak Dev Ji", "Jap", [290, 291, 292, 293, 294]),
    lines: [
      {
        verseId: 290,
        gurmukhi: "ਮੁੰਦਾ ਸੰਤੋਖੁ ਸਰਮੁ ਪਤੁ ਝੋਲੀ ਧਿਆਨ ਕੀ ਕਰਹਿ ਬਿਭੂਤਿ ॥",
        transliteration: "mu(n)dhaa sa(n)tokh saram pat jholee dhiaan kee kareh bibhoot ||",
        translation: "Make contentment your ear-rings, humility your begging bowl, and meditation the ashes you apply to your body.",
      },
      {
        verseId: 291,
        gurmukhi: "ਖਿੰਥਾ ਕਾਲੁ ਕੁਆਰੀ ਕਾਇਆ ਜੁਗਤਿ ਡੰਡਾ ਪਰਤੀਤਿ ॥",
        transliteration: "khi(n)thaa kaal kuaaree kaiaa jugat dda(n)ddaa parateet ||",
        translation: "Let the remembrance of death be the patched coat you wear, let the purity of virginity be your way in the world, and let faith in the Lord be your walking stick.",
      },
      {
        verseId: 292,
        gurmukhi: "ਆਈ ਪੰਥੀ ਸਗਲ ਜਮਾਤੀ ਮਨਿ ਜੀਤੈ ਜਗੁ ਜੀਤੁ ॥",
        transliteration: "aaiee pa(n)thee sagal jamaatee man jeetai jag jeet ||",
        translation: "See the brotherhood of all mankind as the highest order of Yogis; conquer your own mind, and conquer the world.",
      },
      {
        verseId: 293,
        gurmukhi: "ਆਦੇਸੁ ਤਿਸੈ ਆਦੇਸੁ ॥",
        transliteration: "aadhes tisai aadhes ||",
        translation: "I bow to Him, I humbly bow.",
      },
      {
        verseId: 294,
        gurmukhi: "ਆਦਿ ਅਨੀਲੁ ਅਨਾਦਿ ਅਨਾਹਤਿ ਜੁਗੁ ਜੁਗੁ ਏਕੋ ਵੇਸੁ ॥੨੮॥",
        transliteration: "aadh aneel anaadh anaahat jug jug eko ves ||28||",
        translation: "The Primal One, the Pure Light, without beginning, without end. Throughout all the ages, He is One and the Same. ||28||",
      },
    ],
    structure: [
      "Replaces outer religious symbols with inner virtues.",
      "Moves from symbolic discipline toward the direct challenge of mastering the mind.",
      "Closes in bowing, reminding the seeker that self-mastery is still grace-dependent.",
    ],
    keyVerseIds: [290, 292],
    relatedGuidanceIds: ["guidance-mind-mastery", "guidance-contentment"],
    relatedTopicIds: ["topic-anger", "topic-comparison", "topic-discipline"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("discipline", "growing", 30, 8, "discipline"),
  },
  {
    id: "shabad-human-birth-is-chance",
    title: "This Human Life Is a Chance",
    subtitle: "So Purakh",
    summary: "This shabad is a wake-up call. Human life is not framed as prestige but as opportunity for union, sangat, and Naam.",
    whyItMatters: "It gives strong direction when life feels aimless, unfocused, or swallowed by distraction.",
    takeaway: "Use this life for meeting, not merely for managing.",
    themes: ["purpose", "discipline", "sangat"],
    emotionalStates: ["directionless", "numb", "wasting-time"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    lengthBand: "medium",
    citation: citation(48, 12, "Guru Arjan Dev Ji", "So Purakh", [523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533]),
    lines: [
      {
        verseId: 523,
        gurmukhi: "ਆਸਾ ਮਹਲਾ ੫ ॥",
        transliteration: "aasaa mahalaa panjavaa ||",
        translation: "Aasaa, Fifth Mehla:",
      },
      {
        verseId: 524,
        gurmukhi: "ਭਈ ਪਰਾਪਤਿ ਮਾਨੁਖ ਦੇਹੁਰੀਆ ॥",
        transliteration: "bhiee paraapat maanukh dhehureeaa ||",
        translation: "This human body has been given to you.",
      },
      {
        verseId: 525,
        gurmukhi: "ਗੋਬਿੰਦ ਮਿਲਣ ਕੀ ਇਹ ਤੇਰੀ ਬਰੀਆ ॥",
        transliteration: "gobi(n)dh milan kee ieh teree bareeaa ||",
        translation: "This is your chance to meet the Lord of the Universe.",
      },
      {
        verseId: 526,
        gurmukhi: "ਅਵਰਿ ਕਾਜ ਤੇਰੈ ਕਿਤੈ ਨ ਕਾਮ ॥",
        transliteration: "avar kaaj terai kitai na kaam ||",
        translation: "Nothing else will work.",
      },
      {
        verseId: 527,
        gurmukhi: "ਮਿਲੁ ਸਾਧਸੰਗਤਿ ਭਜੁ ਕੇਵਲ ਨਾਮ ॥੧॥",
        transliteration: "mil saadhasa(n)gat bhaj keval naam ||1||",
        translation: "Join the Saadh Sangat, the Company of the Holy; vibrate and meditate on the Jewel of the Naam. ||1||",
      },
      {
        verseId: 528,
        gurmukhi: "ਸਰੰਜਾਮਿ ਲਾਗੁ ਭਵਜਲ ਤਰਨ ਕੈ ॥",
        transliteration: "sara(n)jaam laag bhavajal taran kai ||",
        translation: "Make every effort to cross over this terrifying world-ocean.",
      },
      {
        verseId: 529,
        gurmukhi: "ਜਨਮੁ ਬ੍ਰਿਥਾ ਜਾਤ ਰੰਗਿ ਮਾਇਆ ਕੈ ॥੧॥ ਰਹਾਉ ॥",
        transliteration: "janam birathaa jaat ra(n)g maiaa kai ||1|| rahaau ||",
        translation: "You are squandering this life uselessly in the love of Maya. ||1||Pause||",
      },
      {
        verseId: 530,
        gurmukhi: "ਜਪੁ ਤਪੁ ਸੰਜਮੁ ਧਰਮੁ ਨ ਕਮਾਇਆ ॥",
        transliteration: "jap tap sa(n)jam dharam na kamaiaa ||",
        translation: "I have not practiced meditation, self-discipline, self-restraint or righteous living.",
      },
      {
        verseId: 531,
        gurmukhi: "ਸੇਵਾ ਸਾਧ ਨ ਜਾਨਿਆ ਹਰਿ ਰਾਇਆ ॥",
        transliteration: "sevaa saadh na jaaniaa har raiyaa ||",
        translation: "I have not served the Holy, or the Lord, my King.",
      },
      {
        verseId: 532,
        gurmukhi: "ਕਹੁ ਨਾਨਕ ਹਮ ਨੀਚ ਕਰੰਮਾ ॥",
        transliteration: "kahu naanak ham neech kara(n)maa ||",
        translation: "Says Nanak, our actions are contemptible!",
      },
      {
        verseId: 533,
        gurmukhi: "ਸਰਣਿ ਪਰੇ ਕੀ ਰਾਖਹੁ ਸਰਮਾ ॥੨॥",
        transliteration: "saran pare kee raakhahu saramaa ||2||",
        translation: "O Lord, I seek Your Sanctuary; please, preserve my honor! ||2||",
      },
    ],
    structure: [
      "Names human birth as opportunity, not entitlement.",
      "Points immediately toward sangat and Naam as the path of use.",
      "Ends in humility and surrender rather than self-improvement pride.",
    ],
    keyVerseIds: [524, 525, 527, 529],
    relatedGuidanceIds: ["guidance-human-opportunity", "guidance-sangat-and-naam"],
    relatedTopicIds: ["topic-purpose", "topic-discipline", "topic-loneliness"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("purpose", "beginner", 30, 9, "challenge"),
  },
  {
    id: "shabad-selfless-service",
    title: "Selfless Service Opens the Door",
    subtitle: "Raag Gauree",
    summary: "This shabad ties humility, obedience, Naam, and nishkaam seva together as one spiritual posture.",
    whyItMatters: "It is a corrective for performance, spiritual branding, and service that secretly seeks recognition.",
    takeaway: "Seva becomes transformative when the self stops trying to be seen through it.",
    themes: ["seva", "humility", "discipline"],
    emotionalStates: ["self-conscious", "performing", "eager-to-be-seen"],
    difficulty: "growing",
    estimatedMinutes: 8,
    lengthBand: "medium",
    citation: citation(1026, 286, "Guru Arjan Dev Ji", "Raag Gauree", [12941, 12942, 12943, 12944, 12945, 12946, 12947, 12948, 12949, 12950]),
    lines: [
      {
        verseId: 12941,
        gurmukhi: "ਗੁਰ ਕੈ ਗ੍ਰਿਹਿ ਸੇਵਕੁ ਜੋ ਰਹੈ ॥",
        transliteration: "gur kai gireh sevak jo rahai ||",
        translation: "That selfless servant, who lives in the Guru's household,",
      },
      {
        verseId: 12942,
        gurmukhi: "ਗੁਰ ਕੀ ਆਗਿਆ ਮਨ ਮਹਿ ਸਹੈ ॥",
        transliteration: "gur kee aagiaa man meh sahai ||",
        translation: "is to obey the Guru's Commands with all his mind.",
      },
      {
        verseId: 12943,
        gurmukhi: "ਆਪਸ ਕਉ ਕਰਿ ਕਛੁ ਨ ਜਨਾਵੈ ॥",
        transliteration: "aapas kau kar kachh na janaavai ||",
        translation: "He is not to call attention to himself in any way.",
      },
      {
        verseId: 12944,
        gurmukhi: "ਹਰਿ ਹਰਿ ਨਾਮੁ ਰਿਦੈ ਸਦ ਧਿਆਵੈ ॥",
        transliteration: "har har naam ridhai sadh dhiaavai ||",
        translation: "He is to meditate constantly within his heart on the Name of the Lord.",
      },
      {
        verseId: 12945,
        gurmukhi: "ਮਨੁ ਬੇਚੈ ਸਤਿਗੁਰ ਕੈ ਪਾਸਿ ॥",
        transliteration: "man bechai satigur kai paas ||",
        translation: "One who sells his mind to the True Guru",
      },
      {
        verseId: 12946,
        gurmukhi: "ਤਿਸੁ ਸੇਵਕ ਕੇ ਕਾਰਜ ਰਾਸਿ ॥",
        transliteration: "tis sevak ke kaaraj raas ||",
        translation: "that humble servant's affairs are resolved.",
      },
      {
        verseId: 12947,
        gurmukhi: "ਸੇਵਾ ਕਰਤ ਹੋਇ ਨਿਹਕਾਮੀ ॥",
        transliteration: "sevaa karat hoi nihakaamee ||",
        translation: "One who performs selfless service, without thought of reward,",
      },
      {
        verseId: 12948,
        gurmukhi: "ਤਿਸ ਕਉ ਹੋਤ ਪਰਾਪਤਿ ਸੁਆਮੀ ॥",
        transliteration: "tis kau hot paraapat suaamee ||",
        translation: "shall attain his Lord and Master.",
      },
      {
        verseId: 12949,
        gurmukhi: "ਅਪੁਨੀ ਕ੍ਰਿਪਾ ਜਿਸੁ ਆਪਿ ਕਰੇਇ ॥",
        transliteration: "apunee kirapaa jis aap karei ||",
        translation: "One whom the Lord Himself blesses with His Grace",
      },
      {
        verseId: 12950,
        gurmukhi: "ਨਾਨਕ ਸੋ ਸੇਵਕੁ ਗੁਰ ਕੀ ਮਤਿ ਲੇਇ ॥੪॥੫॥",
        transliteration: "naanak so sevak gur kee mat lei ||4||5||",
        translation: "O Nanak, is the selfless servant who lives the Guru's wisdom. ||4||5||",
      },
    ],
    structure: [
      "Defines the true servant by obedience, inward remembrance, and hiddenness.",
      "Moves from surrendering the mind to the Guru toward nishkaam seva.",
      "Ends by placing the whole path inside grace, not technique.",
    ],
    keyVerseIds: [12943, 12947, 12948],
    relatedGuidanceIds: ["guidance-selfless-service", "guidance-obey-and-remember"],
    relatedTopicIds: ["topic-seva", "topic-purpose", "topic-anger"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("seva", "growing", 30, 9, "seva"),
  },
  {
    id: "shabad-ego-is-disease",
    title: "Ego Is the Disease and the Clue",
    subtitle: "Raag Aasaa",
    summary: "Guru Angad maps ego honestly: where it arises, what it does, and how grace turns the same diagnosis into a cure.",
    whyItMatters: "It is a precise shabad for anger, defensiveness, comparison, and the feeling that every conflict is happening outside the self.",
    takeaway: "The cure begins when ego is seen as illness rather than identity.",
    themes: ["ego", "anger", "self-awareness"],
    emotionalStates: ["defensive", "offended", "self-important"],
    difficulty: "growing",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(1706, 466, "Guru Angad Dev Ji", "Raag Aasaa", [20958, 20959, 20960, 20961, 20962, 20963, 20964, 20965]),
    lines: [
      {
        verseId: 20958,
        gurmukhi: "ਮਹਲਾ ੨ ॥",
        transliteration: "mahalaa doojaa ||",
        translation: "Second Mehla:",
      },
      {
        verseId: 20959,
        gurmukhi: "ਹਉਮੈ ਏਹਾ ਜਾਤਿ ਹੈ ਹਉਮੈ ਕਰਮ ਕਮਾਹਿ ॥",
        transliteration: "haumai ehaa jaat hai haumai karam kamaeh ||",
        translation: "This is the nature of ego, that people perform their actions in ego.",
      },
      {
        verseId: 20960,
        gurmukhi: "ਹਉਮੈ ਏਈ ਬੰਧਨਾ ਫਿਰਿ ਫਿਰਿ ਜੋਨੀ ਪਾਹਿ ॥",
        transliteration: "haumai eiee ba(n)dhanaa fir fir jonee paeh ||",
        translation: "This is the bondage of ego, that time and time again, they are reborn.",
      },
      {
        verseId: 20961,
        gurmukhi: "ਹਉਮੈ ਕਿਥਹੁ ਊਪਜੈ ਕਿਤੁ ਸੰਜਮਿ ਇਹ ਜਾਇ ॥",
        transliteration: "haumai kithahu uoopajai kit sa(n)jam ieh jai ||",
        translation: "Where does ego come from? How can it be removed?",
      },
      {
        verseId: 20962,
        gurmukhi: "ਹਉਮੈ ਏਹੋ ਹੁਕਮੁ ਹੈ ਪਇਐ ਕਿਰਤਿ ਫਿਰਾਹਿ ॥",
        transliteration: "haumai eho hukam hai piaai kirat firaeh ||",
        translation: "This ego exists by the Lord's Order; people wander according to their past actions.",
      },
      {
        verseId: 20963,
        gurmukhi: "ਹਉਮੈ ਦੀਰਘ ਰੋਗੁ ਹੈ ਦਾਰੂ ਭੀ ਇਸੁ ਮਾਹਿ ॥",
        transliteration: "haumai dheeragh rog hai dhaaroo bhee is maeh ||",
        translation: "Ego is a chronic disease, but it contains its own cure as well.",
      },
      {
        verseId: 20964,
        gurmukhi: "ਕਿਰਪਾ ਕਰੇ ਜੇ ਆਪਣੀ ਤਾ ਗੁਰ ਕਾ ਸਬਦੁ ਕਮਾਹਿ ॥",
        transliteration: "kirapaa kare je aapanee taa gur kaa sabadh kamaeh ||",
        translation: "If the Lord grants His Grace, one acts according to the Teachings of the Guru's Shabad.",
      },
      {
        verseId: 20965,
        gurmukhi: "ਨਾਨਕੁ ਕਹੈ ਸੁਣਹੁ ਜਨਹੁ ਇਤੁ ਸੰਜਮਿ ਦੁਖ ਜਾਹਿ ॥੨॥",
        transliteration: "naanak kahai sunahu janahu it sa(n)jam dhukh jaeh ||2||",
        translation: "Nanak says, listen, people: in this way, troubles depart. ||2||",
      },
    ],
    structure: [
      "Describes ego as a pattern shaping action and rebirth.",
      "Asks directly how ego is removed rather than merely condemned.",
      "Answers with grace and the lived discipline of Guru's Shabad.",
    ],
    keyVerseIds: [20961, 20963, 20964],
    relatedGuidanceIds: ["guidance-ego-cure"],
    relatedTopicIds: ["topic-ego", "topic-anger", "topic-comparison"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("ego", "growing", 30, 9, "challenge"),
  },
  {
    id: "shabad-suffering-as-medicine",
    title: "When Suffering Becomes Medicine",
    subtitle: "Raag Aasaa",
    summary: "Guru Nanak does not glorify pain. He exposes how comfort can sedate remembrance while suffering can reopen dependence on the Creator.",
    whyItMatters: "This shabad reframes hard seasons without trivializing them and helps a user move from resentment toward reverent honesty.",
    takeaway: "Hardship is not automatically holy, but it can become the place where reality is finally faced.",
    themes: ["reflection", "anxiety", "gratitude"],
    emotionalStates: ["hurting", "resentful", "confused"],
    difficulty: "growing",
    estimatedMinutes: 8,
    lengthBand: "short",
    citation: citation(1721, 469, "Guru Nanak Dev Ji", "Raag Aasaa", [21089, 21090, 21091, 21092, 21093, 21094, 21095, 21096]),
    lines: [
      {
        verseId: 21089,
        gurmukhi: "ਸਲੋਕੁ ਮਃ ੧ ॥",
        transliteration: "salok mahalaa pehilaa ||",
        translation: "Shalok, First Mehla:",
      },
      {
        verseId: 21090,
        gurmukhi: "ਦੁਖੁ ਦਾਰੂ ਸੁਖੁ ਰੋਗੁ ਭਇਆ ਜਾ ਸੁਖੁ ਤਾਮਿ ਨ ਹੋਈ ॥",
        transliteration: "dhukh dhaaroo sukh rog bhiaa jaa sukh taam na hoiee ||",
        translation: "Suffering is the medicine, and pleasure the disease, because where there is pleasure, there is no desire for God.",
      },
      {
        verseId: 21091,
        gurmukhi: "ਤੂੰ ਕਰਤਾ ਕਰਣਾ ਮੈ ਨਾਹੀ ਜਾ ਹਉ ਕਰੀ ਨ ਹੋਈ ॥੧॥",
        transliteration: "too(n) karataa karanaa mai naahee jaa hau karee na hoiee ||1||",
        translation: "You are the Creator Lord; I can do nothing. Even if I try, nothing happens. ||1||",
      },
      {
        verseId: 21092,
        gurmukhi: "ਬਲਿਹਾਰੀ ਕੁਦਰਤਿ ਵਸਿਆ ॥",
        transliteration: "balihaaree kudharat vasiaa ||",
        translation: "I am a sacrifice to Your almighty creative power which is pervading everywhere.",
      },
      {
        verseId: 21093,
        gurmukhi: "ਤੇਰਾ ਅੰਤੁ ਨ ਜਾਈ ਲਖਿਆ ॥੧॥ ਰਹਾਉ ॥",
        transliteration: "teraa a(n)t na jaiee lakhiaa ||1|| rahaau ||",
        translation: "Your limits cannot be known. ||1||Pause||",
      },
      {
        verseId: 21094,
        gurmukhi: "ਜਾਤਿ ਮਹਿ ਜੋਤਿ ਜੋਤਿ ਮਹਿ ਜਾਤਾ ਅਕਲ ਕਲਾ ਭਰਪੂਰਿ ਰਹਿਆ ॥",
        transliteration: "jaat meh jot jot meh jaataa akal kalaa bharapoor rahiaa ||",
        translation: "Your Light is in Your creatures, and Your creatures are in Your Light; Your almighty power is pervading everywhere.",
      },
      {
        verseId: 21095,
        gurmukhi: "ਤੂੰ ਸਚਾ ਸਾਹਿਬੁ ਸਿਫਤਿ ਸੁਆਲਿੑਉ ਜਿਨਿ ਕੀਤੀ ਸੋ ਪਾਰਿ ਪਇਆ ॥",
        transliteration: "too(n) sachaa saahib sifat suaali(h)au jin keetee so paar piaa ||",
        translation: "You are the True Lord and Master; Your Praise is so beautiful. One who sings it, is carried across.",
      },
      {
        verseId: 21096,
        gurmukhi: "ਕਹੁ ਨਾਨਕ ਕਰਤੇ ਕੀਆ ਬਾਤਾ ਜੋ ਕਿਛੁ ਕਰਣਾ ਸੁ ਕਰਿ ਰਹਿਆ ॥੨॥",
        transliteration: "kahu naanak karate keeaa baataa jo kichh karanaa su kar rahiaa ||2||",
        translation: "Nanak speaks the stories of the Creator Lord; whatever He is to do, He does. ||2||",
      },
    ],
    structure: [
      "Begins with the startling inversion of pain and pleasure.",
      "Moves quickly into dependence on the Creator, not self-management.",
      "Ends in awe at the Creator's all-pervading presence and action.",
    ],
    keyVerseIds: [21090, 21091, 21095],
    relatedGuidanceIds: ["guidance-suffering-as-medicine", "guidance-the-creator-acts"],
    relatedTopicIds: ["topic-anxiety", "topic-gratitude", "topic-attachment"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("reflection", "growing", 30, 9, "reflection"),
  },
  {
    id: "shabad-steadied-by-creator",
    title: "Why Do You Waver?",
    subtitle: "Raag Tilang",
    summary: "This shabad meets fear with tenderness, not scolding. The repeated logic is simple: the One who made you has not stopped caring for you.",
    whyItMatters: "It is a high-trust shabad for fear, panic, loneliness, and inner instability.",
    takeaway: "The answer to fear is not bravado. It is remembrance of the One already holding you.",
    themes: ["anxiety", "fear", "trust"],
    emotionalStates: ["afraid", "shaken", "alone"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    lengthBand: "medium",
    citation: citation(2772, 724, "Guru Arjan Dev Ji", "Raag Tilang", [30984, 30985, 30986, 30987, 30988, 30989, 30990, 30991, 30992, 30993, 30994, 30995]),
    lines: [
      {
        verseId: 30984,
        gurmukhi: "ਤਿਲੰਗ ਮਹਲਾ ੫ ਘਰੁ ੩ ॥",
        transliteration: "tila(n)g mahalaa panjavaa ghar teejaa ||",
        translation: "Tilang, Fifth Mehla, Third House:",
      },
      {
        verseId: 30985,
        gurmukhi: "ਮਿਹਰਵਾਨੁ ਸਾਹਿਬੁ ਮਿਹਰਵਾਨੁ ॥",
        transliteration: "miharavaan saahib miharavaan ||",
        translation: "Merciful, the Lord Master is Merciful.",
      },
      {
        verseId: 30986,
        gurmukhi: "ਸਾਹਿਬੁ ਮੇਰਾ ਮਿਹਰਵਾਨੁ ॥",
        transliteration: "saahib meraa miharavaan ||",
        translation: "My Lord Master is Merciful.",
      },
      {
        verseId: 30987,
        gurmukhi: "ਜੀਅ ਸਗਲ ਕਉ ਦੇਇ ਦਾਨੁ ॥ ਰਹਾਉ ॥",
        transliteration: "jeea sagal kau dhei dhaan || rahaau ||",
        translation: "He gives His gifts to all beings. ||Pause||",
      },
      {
        verseId: 30988,
        gurmukhi: "ਤੂ ਕਾਹੇ ਡੋਲਹਿ ਪ੍ਰਾਣੀਆ ਤੁਧੁ ਰਾਖੈਗਾ ਸਿਰਜਣਹਾਰੁ ॥",
        transliteration: "too kaahe ddoleh praaneeaa tudh raakhaigaa sirajanahaar ||",
        translation: "Why do you waver, O mortal being? The Creator Lord Himself shall protect you.",
      },
      {
        verseId: 30989,
        gurmukhi: "ਜਿਨਿ ਪੈਦਾਇਸਿ ਤੂ ਕੀਆ ਸੋਈ ਦੇਇ ਆਧਾਰੁ ॥੧॥",
        transliteration: "jin paidhais too keeaa soiee dhei aadhaar ||1||",
        translation: "He who created you, will also give you nourishment. ||1||",
      },
      {
        verseId: 30990,
        gurmukhi: "ਜਿਨਿ ਉਪਾਈ ਮੇਦਨੀ ਸੋਈ ਕਰਦਾ ਸਾਰ ॥",
        transliteration: "jin upaiee medhanee soiee karadhaa saar ||",
        translation: "The One who created the world, takes care of it.",
      },
      {
        verseId: 30991,
        gurmukhi: "ਘਟਿ ਘਟਿ ਮਾਲਕੁ ਦਿਲਾ ਕਾ ਸਚਾ ਪਰਵਦਗਾਰੁ ॥੨॥",
        transliteration: "ghaT ghaT maalak dhilaa kaa sachaa paravadhagaar ||2||",
        translation: "In each and every heart and mind, the Lord is the True Cherisher. ||2||",
      },
      {
        verseId: 30992,
        gurmukhi: "ਜਿਨਿ ਕੀਤਾ ਤਿਸਹਿ ਨ ਜਾਨਈ ਮਨਮੁਖਿ ਪਚਿ ਮੁਏ ਗਵਾਰ ॥",
        transliteration: "jin keetaa tiseh na jaanee manamukh pach mue gavaar ||",
        translation: "The self-willed fools do not know the One who created them; they rot away and die.",
      },
      {
        verseId: 30993,
        gurmukhi: "ਆਵਣ ਜਾਣਾ ਨਾ ਥੀਐ ਪੂਰੇ ਗੁਰ ਦਰਬਾਰ ॥੩॥",
        transliteration: "aavan jaanaa na theeaai poore gur dharabaar ||3||",
        translation: "The cycle of coming and going in reincarnation is ended, in the Court of the Perfect Guru. ||3||",
      },
      {
        verseId: 30994,
        gurmukhi: "ਤੂ ਕਾਹੇ ਡੋਲਹਿ ਪ੍ਰਾਣੀਆ ਵੇਪਰਵਾਹੁ ਰਖੈਗਾ ॥",
        transliteration: "too kaahe ddoleh praaneeaa veparavaahu rakhaigaa ||",
        translation: "Why do you waver, O mortal being? The Lord who needs no care will care for you.",
      },
      {
        verseId: 30995,
        gurmukhi: "ਨਾਨਕ ਦਾਸੁ ਚਰਨੀ ਲਾਗਾ ਸਾਹਿਬੁ ਪਰਬਤੁ ਠਹਰੈਗਾ ॥੪॥੧॥",
        transliteration: "naanak dhaas charanee laagaa saahib parabat Thaharaiagaa ||4||1||",
        translation: "Servant Nanak falls at His Feet; the Lord and Master stands firm like a mountain. ||4||1||",
      },
    ],
    structure: [
      "Begins by naming the Lord as merciful before addressing fear directly.",
      "Answers wavering by reminding the listener of the Creator's care.",
      "Repeats the central reassurance in a steadier, more anchored form near the end.",
    ],
    keyVerseIds: [30985, 30988, 30994],
    relatedGuidanceIds: ["guidance-fear-and-protection"],
    relatedTopicIds: ["topic-anxiety", "topic-loneliness", "topic-hukam"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("anxiety", "beginner", 30, 10, "comfort"),
  },
  {
    id: "shabad-gratitude-restores-naam",
    title: "Gratitude That Returns to Naam",
    subtitle: "Mundhaavanee Fifth Mehl",
    summary: "This short shalok is a mature form of gratitude. It does not begin in self-congratulation but in humility, mercy, and the gift of Naam.",
    whyItMatters: "It helps gratitude move past positivity into truthful dependence on grace.",
    takeaway: "Real gratitude does not inflate the self. It softens it.",
    themes: ["gratitude", "humility", "naam"],
    emotionalStates: ["thankful", "softened", "humbled"],
    difficulty: "beginner",
    estimatedMinutes: 6,
    lengthBand: "short",
    citation: citation(5539, 1429, "Guru Arjan Dev Ji", "Mundhaavanee Fifth Mehl", [60337, 60338, 60339, 60340, 60341]),
    lines: [
      {
        verseId: 60337,
        gurmukhi: "ਸਲੋਕ ਮਹਲਾ ੫ ॥",
        transliteration: "salok mahalaa panjavaa ||",
        translation: "Shalok, Fifth Mehla:",
      },
      {
        verseId: 60338,
        gurmukhi: "ਤੇਰਾ ਕੀਤਾ ਜਾਤੋ ਨਾਹੀ ਮੈਨੋ ਜੋਗੁ ਕੀਤੋਈ ॥",
        transliteration: "teraa keetaa jaato naahee maino jog keetoiee ||",
        translation: "I have not appreciated what You have done for me, Lord; only You can make me worthy.",
      },
      {
        verseId: 60339,
        gurmukhi: "ਮੈ ਨਿਰਗੁਣਿਆਰੇ ਕੋ ਗੁਣੁ ਨਾਹੀ ਆਪੇ ਤਰਸੁ ਪਇਓਈ ॥",
        transliteration: "mai niraguniaare ko gun naahee aape taras pioiee ||",
        translation: "I am unworthy - I have no worth or virtues at all. You have taken pity on me.",
      },
      {
        verseId: 60340,
        gurmukhi: "ਤਰਸੁ ਪਇਆ ਮਿਹਰਾਮਤਿ ਹੋਈ ਸਤਿਗੁਰੁ ਸਜਣੁ ਮਿਲਿਆ ॥",
        transliteration: "taras piaa miharaamat hoiee satigur sajan miliaa ||",
        translation: "You took pity on me, and blessed me with Your Mercy, and I have met the True Guru, my Friend.",
      },
      {
        verseId: 60341,
        gurmukhi: "ਨਾਨਕ ਨਾਮੁ ਮਿਲੈ ਤਾਂ ਜੀਵਾਂ ਤਨੁ ਮਨੁ ਥੀਵੈ ਹਰਿਆ ॥੧॥",
        transliteration: "naanak naam milai taa(n) jeevaa(n) tan man theevai hariaa ||1||",
        translation: "O Nanak, if I am blessed with the Naam, I live, and my body and mind blossom forth. ||1||",
      },
    ],
    structure: [
      "Begins by admitting that the Lord's care has not been properly appreciated.",
      "Moves through unworthiness and mercy rather than self-esteem.",
      "Ends by locating life itself in the gift of Naam.",
    ],
    keyVerseIds: [60338, 60340, 60341],
    relatedGuidanceIds: ["guidance-gratitude"],
    relatedTopicIds: ["topic-gratitude", "topic-comparison", "topic-attachment"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("gratitude", "beginner", 30, 8, "gratitude"),
  },
  {
    id: "shabad-child-of-grace",
    title: "Held Like a Child in Sangat",
    subtitle: "Raag Maajh",
    summary: "This shabad moves from searching and longing toward refuge in sangat and the care of the Guru.",
    whyItMatters: "It is especially strong for loneliness, dependence, and the need to be guided without shame.",
    takeaway: "Neediness is not rejected here. It is brought honestly into the Guru's care.",
    themes: ["loneliness", "sangat", "trust"],
    emotionalStates: ["alone", "yearning", "dependent"],
    difficulty: "growing",
    estimatedMinutes: 9,
    lengthBand: "medium",
    citation: citation(271, 94, "Guru Raam Daas Ji", "Raag Maajh", [3754, 3755, 3756, 3757, 3758, 3759, 3760, 3761, 3762, 3763, 3764, 3765, 3766]),
    lines: [
      {
        verseId: 3754,
        gurmukhi: "ਮਾਝ ਮਹਲਾ ੪ ॥",
        transliteration: "maajh mahalaa chauthhaa ||",
        translation: "Maajh, Fourth Mehla:",
      },
      {
        verseId: 3755,
        gurmukhi: "ਮਧੁਸੂਦਨ ਮੇਰੇ ਮਨ ਤਨ ਪ੍ਰਾਨਾ ॥",
        transliteration: "madhusoodhan mere man tan praanaa ||",
        translation: "The Lord is my mind, body and breath of life.",
      },
      {
        verseId: 3756,
        gurmukhi: "ਹਉ ਹਰਿ ਬਿਨੁ ਦੂਜਾ ਅਵਰੁ ਨ ਜਾਨਾ ॥",
        transliteration: "hau har bin dhoojaa avar na jaanaa ||",
        translation: "I do not know any other than the Lord.",
      },
      {
        verseId: 3757,
        gurmukhi: "ਕੋਈ ਸਜਣੁ ਸੰਤੁ ਮਿਲੈ ਵਡਭਾਗੀ ਮੈ ਹਰਿ ਪ੍ਰਭੁ ਪਿਆਰਾ ਦਸੈ ਜੀਉ ॥੧॥",
        transliteration: "koiee sajan sa(n)t milai vaddabhaagee mai har prabh piaaraa dhasai jeeau ||1||",
        translation: "If only I could have the good fortune to meet some friendly Saint; he might show me the Way to my Beloved Lord God. ||1||",
      },
      {
        verseId: 3758,
        gurmukhi: "ਹਉ ਮਨੁ ਤਨੁ ਖੋਜੀ ਭਾਲਿ ਭਾਲਾਈ ॥",
        transliteration: "hau man tan khojee bhaal bhaalaiee ||",
        translation: "I have searched my mind and body, through and through.",
      },
      {
        verseId: 3759,
        gurmukhi: "ਕਿਉ ਪਿਆਰਾ ਪ੍ਰੀਤਮੁ ਮਿਲੈ ਮੇਰੀ ਮਾਈ ॥",
        transliteration: "kiau piaaraa preetam milai meree maiee ||",
        translation: "How can I meet my Darling Beloved, O my mother?",
      },
      {
        verseId: 3760,
        gurmukhi: "ਮਿਲਿ ਸਤਸੰਗਤਿ ਖੋਜੁ ਦਸਾਈ ਵਿਚਿ ਸੰਗਤਿ ਹਰਿ ਪ੍ਰਭੁ ਵਸੈ ਜੀਉ ॥੨॥",
        transliteration: "mil satasa(n)gat khoj dhasaiee vich sa(n)gat har prabh vasai jeeau ||2||",
        translation: "Joining the Sat Sangat, the True Congregation, I ask about the Path to God. In that Congregation, the Lord God abides. ||2||",
      },
      {
        verseId: 3761,
        gurmukhi: "ਮੇਰਾ ਪਿਆਰਾ ਪ੍ਰੀਤਮੁ ਸਤਿਗੁਰੁ ਰਖਵਾਲਾ ॥",
        transliteration: "meraa piaaraa preetam satigur rakhavaalaa ||",
        translation: "My Darling Beloved True Guru is my Protector.",
      },
      {
        verseId: 3762,
        gurmukhi: "ਹਮ ਬਾਰਿਕ ਦੀਨ ਕਰਹੁ ਪ੍ਰਤਿਪਾਲਾ ॥",
        transliteration: "ham baarik dheen karahu pratipaalaa ||",
        translation: "I am a helpless child-please cherish me.",
      },
      {
        verseId: 3763,
        gurmukhi: "ਮੇਰਾ ਮਾਤ ਪਿਤਾ ਗੁਰੁ ਸਤਿਗੁਰੁ ਪੂਰਾ ਗੁਰ ਜਲ ਮਿਲਿ ਕਮਲੁ ਵਿਗਸੈ ਜੀਉ ॥੩॥",
        transliteration: "meraa maat pitaa gur satigur pooraa gur jal mil kamal vigasai jeeau ||3||",
        translation: "The Guru, the Perfect True Guru, is my Mother and Father. Obtaining the Water of the Guru, the lotus of my heart blossoms forth. ||3||",
      },
      {
        verseId: 3764,
        gurmukhi: "ਮੈ ਬਿਨੁ ਗੁਰ ਦੇਖੇ ਨੀਦ ਨ ਆਵੈ ॥",
        transliteration: "mai bin gur dhekhe needh na aavai ||",
        translation: "Without seeing my Guru, sleep does not come.",
      },
      {
        verseId: 3765,
        gurmukhi: "ਮੇਰੇ ਮਨ ਤਨਿ ਵੇਦਨ ਗੁਰ ਬਿਰਹੁ ਲਗਾਵੈ ॥",
        transliteration: "mere man tan vedhan gur birahu lagaavai ||",
        translation: "My mind and body are afflicted with the pain of separation from the Guru.",
      },
      {
        verseId: 3766,
        gurmukhi: "ਹਰਿ ਹਰਿ ਦਇਆ ਕਰਹੁ ਗੁਰੁ ਮੇਲਹੁ ਜਨ ਨਾਨਕ ਗੁਰ ਮਿਲਿ ਰਹਸੈ ਜੀਉ ॥੪॥੨॥",
        transliteration: "har har dhiaa karahu gur melahu jan naanak gur mil rahasai jeeau ||4||2||",
        translation: "O Lord, Har, Har, show mercy to me, that I may meet my Guru. Meeting the Guru, servant Nanak blossoms forth. ||4||2||",
      },
    ],
    structure: [
      "Names longing without pretending it is already solved.",
      "Directs that longing toward sangat rather than isolated self-repair.",
      "Finds rest in being cared for by the Guru like a child.",
    ],
    keyVerseIds: [3757, 3760, 3762, 3763],
    relatedGuidanceIds: ["guidance-cherished-child"],
    relatedTopicIds: ["topic-loneliness", "topic-anxiety", "topic-purpose"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("loneliness", "growing", 30, 8, "comfort"),
  },
  {
    id: "shabad-remembrance-brings-peace",
    title: "Remember and Find Peace",
    subtitle: "Raag Gauree",
    summary: "The repeated verb is the point: remember, remember, remember. Peace is not treated as mood but as the fruit of anchored remembrance.",
    whyItMatters: "It is direct and accessible for users dealing with anxious loops, noise, and spiritual drift.",
    takeaway: "Steady remembrance calms what scattered thinking cannot.",
    themes: ["anxiety", "naam", "discipline"],
    emotionalStates: ["overthinking", "restless", "drifting"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    lengthBand: "medium",
    citation: citation(872, 262, "Guru Arjan Dev Ji", "Raag Gauree", [11501, 11502, 11503, 11504, 11505, 11506, 11507, 11508, 11509, 11510, 11511]),
    lines: [
      {
        verseId: 11501,
        gurmukhi: "ਅਸਟਪਦੀ ॥",
        transliteration: "asaTapadhee ||",
        translation: "Ashtapadee:",
      },
      {
        verseId: 11502,
        gurmukhi: "ਸਿਮਰਉ ਸਿਮਰਿ ਸਿਮਰਿ ਸੁਖੁ ਪਾਵਉ ॥",
        transliteration: "simarau simar simar sukh paavau ||",
        translation: "Meditate, meditate, meditate in remembrance of Him, and find peace.",
      },
      {
        verseId: 11503,
        gurmukhi: "ਕਲਿ ਕਲੇਸ ਤਨ ਮਾਹਿ ਮਿਟਾਵਉ ॥",
        transliteration: "kal kales tan maeh miTaavau ||",
        translation: "Worry and anguish shall be dispelled from your body.",
      },
      {
        verseId: 11504,
        gurmukhi: "ਸਿਮਰਉ ਜਾਸੁ ਬਿਸੁੰਭਰ ਏਕੈ ॥",
        transliteration: "simarau jaas bisu(n)bhar ekai ||",
        translation: "Remember in praise the One who pervades the whole Universe.",
      },
      {
        verseId: 11505,
        gurmukhi: "ਨਾਮੁ ਜਪਤ ਅਗਨਤ ਅਨੇਕੈ ॥",
        transliteration: "naam japat aganat anekai ||",
        translation: "His Name is chanted by countless people, in so many ways.",
      },
      {
        verseId: 11506,
        gurmukhi: "ਬੇਦ ਪੁਰਾਨ ਸਿੰਮ੍ਰਿਤਿ ਸੁਧਾਖੵਰ ॥",
        transliteration: "bedh puraan si(n)mirat sudhaakhayer ||",
        translation: "The Vedas, the Puraanas and the Simritees, the purest of utterances,",
      },
      {
        verseId: 11507,
        gurmukhi: "ਕੀਨੇ ਰਾਮ ਨਾਮ ਇਕ ਆਖੵਰ ॥",
        transliteration: "keene raam naam ik aakhayer ||",
        translation: "were created from the One Word of the Name of the Lord.",
      },
      {
        verseId: 11508,
        gurmukhi: "ਕਿਨਕਾ ਏਕ ਜਿਸੁ ਜੀਅ ਬਸਾਵੈ ॥",
        transliteration: "kinakaa ek jis jeea basaavai ||",
        translation: "That one, in whose soul the One Lord dwells",
      },
      {
        verseId: 11509,
        gurmukhi: "ਤਾ ਕੀ ਮਹਿਮਾ ਗਨੀ ਨ ਆਵੈ ॥",
        transliteration: "taa kee mahimaa ganee na aavai ||",
        translation: "the praises of his glory cannot be recounted.",
      },
      {
        verseId: 11510,
        gurmukhi: "ਕਾਂਖੀ ਏਕੈ ਦਰਸ ਤੁਹਾਰੋ ॥",
        transliteration: "kaa(n)khee ekai dharas tuhaaro ||",
        translation: "Those who yearn only for the blessing of Your Darshan",
      },
      {
        verseId: 11511,
        gurmukhi: "ਨਾਨਕ ਉਨ ਸੰਗਿ ਮੋਹਿ ਉਧਾਰੋ ॥੧॥",
        transliteration: "naanak un sa(n)g moh udhaaro ||1||",
        translation: "Nanak: save me along with them! ||1||",
      },
    ],
    structure: [
      "Repeats remembrance as a practice, not a mood.",
      "Connects remembrance with bodily easing of anguish.",
      "Ends by locating rescue alongside those already living in remembrance.",
    ],
    keyVerseIds: [11502, 11503, 11511],
    relatedGuidanceIds: ["guidance-remember-and-find-peace"],
    relatedTopicIds: ["topic-anxiety", "topic-discipline", "topic-loneliness"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("anxiety", "beginner", 30, 8, "comfort"),
  },
  {
    id: "shabad-honor-women",
    title: "Honor the One Through Whom We Arrive",
    subtitle: "Raag Aasaa",
    summary: "Guru Nanak confronts social contempt directly and dissolves it through truth: human life itself comes through woman.",
    whyItMatters: "It grounds equality in Gurbani itself and interrupts dismissive, demeaning, or inherited cultural habits.",
    takeaway: "What Guru honors cannot be spoken of with contempt.",
    themes: ["equality", "humility", "relationships"],
    emotionalStates: ["dismissive", "proud", "habit-bound"],
    difficulty: "beginner",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(1748, 473, "Guru Nanak Dev Ji", "Raag Aasaa", [21283, 21284, 21285, 21286, 21287, 21288, 21289, 21290, 21291]),
    lines: [
      {
        verseId: 21283,
        gurmukhi: "ਮਃ ੧ ॥",
        transliteration: "mahalaa pehilaa ||",
        translation: "First Mehla:",
      },
      {
        verseId: 21284,
        gurmukhi: "ਭੰਡਿ ਜੰਮੀਐ ਭੰਡਿ ਨਿੰਮੀਐ ਭੰਡਿ ਮੰਗਣੁ ਵੀਆਹੁ ॥",
        transliteration: "bha(n)dd ja(n)meeaai bha(n)dd ni(n)meeaai bha(n)dd ma(n)gan veeaahu ||",
        translation: "From woman, man is born; within woman, man is conceived; to woman he is engaged and married.",
      },
      {
        verseId: 21285,
        gurmukhi: "ਭੰਡਹੁ ਹੋਵੈ ਦੋਸਤੀ ਭੰਡਹੁ ਚਲੈ ਰਾਹੁ ॥",
        transliteration: "bha(n)ddahu hovai dhosatee bha(n)ddahu chalai raahu ||",
        translation: "Woman becomes his friend; through woman, the future generations come.",
      },
      {
        verseId: 21286,
        gurmukhi: "ਭੰਡੁ ਮੁਆ ਭੰਡੁ ਭਾਲੀਐ ਭੰਡਿ ਹੋਵੈ ਬੰਧਾਨੁ ॥",
        transliteration: "bha(n)dd muaa bha(n)dd bhaaleeaai bha(n)dd hovai ba(n)dhaan ||",
        translation: "When his woman dies, he seeks another woman; to woman he is bound.",
      },
      {
        verseId: 21287,
        gurmukhi: "ਸੋ ਕਿਉ ਮੰਦਾ ਆਖੀਐ ਜਿਤੁ ਜੰਮਹਿ ਰਾਜਾਨ ॥",
        transliteration: "so kiau ma(n)dhaa aakheeaai jit ja(n)meh raajaan ||",
        translation: "So why call her bad? From her, kings are born.",
      },
      {
        verseId: 21288,
        gurmukhi: "ਭੰਡਹੁ ਹੀ ਭੰਡੁ ਊਪਜੈ ਭੰਡੈ ਬਾਝੁ ਨ ਕੋਇ ॥",
        transliteration: "bha(n)ddahu hee bha(n)dd uoopajai bha(n)ddai baajh na koi ||",
        translation: "From woman, woman is born; without woman, there would be no one at all.",
      },
      {
        verseId: 21289,
        gurmukhi: "ਨਾਨਕ ਭੰਡੈ ਬਾਹਰਾ ਏਕੋ ਸਚਾ ਸੋਇ ॥",
        transliteration: "naanak bha(n)ddai baaharaa eko sachaa soi ||",
        translation: "O Nanak, only the True Lord is without a woman.",
      },
      {
        verseId: 21290,
        gurmukhi: "ਜਿਤੁ ਮੁਖਿ ਸਦਾ ਸਾਲਾਹੀਐ ਭਾਗਾ ਰਤੀ ਚਾਰਿ ॥",
        transliteration: "jit mukh sadhaa saalaaheeaai bhaagaa ratee chaar ||",
        translation: "That mouth which praises the Lord continually is blessed and beautiful.",
      },
      {
        verseId: 21291,
        gurmukhi: "ਨਾਨਕ ਤੇ ਮੁਖ ਊਜਲੇ ਤਿਤੁ ਸਚੈ ਦਰਬਾਰਿ ॥੨॥",
        transliteration: "naanak te mukh uoojale tit sachai dharabaar ||2||",
        translation: "O Nanak, those faces shall be radiant in the Court of the True Lord. ||2||",
      },
    ],
    structure: [
      "Names ordinary social realities to cut through abstraction.",
      "Turns the argument by asking why contempt is spoken toward the one through whom life arrives.",
      "Closes by moving honor back toward praise of the Lord.",
    ],
    keyVerseIds: [21284, 21287, 21289],
    relatedGuidanceIds: ["guidance-honor-what-guru-honors"],
    relatedTopicIds: ["topic-anger", "topic-comparison"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("equality", "beginner", 30, 6, "challenge"),
  },
  {
    id: "shabad-work-give-know-the-path",
    title: "Work, Share, and Know the Path",
    subtitle: "Raag Saarang",
    summary: "Guru Nanak exposes religious posturing and then names the path plainly: honest work and open-handed giving.",
    whyItMatters: "It gives practical moral texture to discipline and seva without romanticizing performance.",
    takeaway: "The path is not performed through appearance. It is walked through honest labor and giving.",
    themes: ["seva", "discipline", "honesty"],
    emotionalStates: ["pretending", "unclear", "performing"],
    difficulty: "growing",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(4480, 1245, "Guru Nanak Dev Ji", "Raag Saarang", [53364, 53365, 53366, 53367, 53368, 53369, 53370, 53371, 53372]),
    lines: [
      {
        verseId: 53364,
        gurmukhi: "ਸਲੋਕ ਮਃ ੧ ॥",
        transliteration: "salok mahalaa pehilaa ||",
        translation: "Shalok, First Mehla:",
      },
      {
        verseId: 53365,
        gurmukhi: "ਗਿਆਨ ਵਿਹੂਣਾ ਗਾਵੈ ਗੀਤ ॥",
        transliteration: "giaan vihoonaa gaavai geet ||",
        translation: "The one who lacks spiritual wisdom sings religious songs.",
      },
      {
        verseId: 53366,
        gurmukhi: "ਭੁਖੇ ਮੁਲਾਂ ਘਰੇ ਮਸੀਤਿ ॥",
        transliteration: "bhukhe mulaa(n) ghare maseet ||",
        translation: "The hungry Mullah turns his home into a mosque.",
      },
      {
        verseId: 53367,
        gurmukhi: "ਮਖਟੂ ਹੋਇ ਕੈ ਕੰਨ ਪੜਾਏ ॥",
        transliteration: "makhaToo hoi kai ka(n)n paRaae ||",
        translation: "The lazy unemployed has his ears pierced to look like a Yogi.",
      },
      {
        verseId: 53368,
        gurmukhi: "ਫਕਰੁ ਕਰੇ ਹੋਰੁ ਜਾਤਿ ਗਵਾਏ ॥",
        transliteration: "fakar kare hor jaat gavaae ||",
        translation: "Someone else becomes a pan-handler, and loses his social status.",
      },
      {
        verseId: 53369,
        gurmukhi: "ਗੁਰੁ ਪੀਰੁ ਸਦਾਏ ਮੰਗਣ ਜਾਇ ॥",
        transliteration: "gur peer sadhaae ma(n)gan jai ||",
        translation: "One who calls himself a guru or a spiritual teacher, while he goes around begging",
      },
      {
        verseId: 53370,
        gurmukhi: "ਤਾ ਕੈ ਮੂਲਿ ਨ ਲਗੀਐ ਪਾਇ ॥",
        transliteration: "taa kai mool na lageeaai pai ||",
        translation: "don't ever touch his feet.",
      },
      {
        verseId: 53371,
        gurmukhi: "ਘਾਲਿ ਖਾਇ ਕਿਛੁ ਹਥਹੁ ਦੇਇ ॥",
        transliteration: "ghaal khai kichh hathahu dhei ||",
        translation: "One who works for what he eats, and gives some of what he has",
      },
      {
        verseId: 53372,
        gurmukhi: "ਨਾਨਕ ਰਾਹੁ ਪਛਾਣਹਿ ਸੇਇ ॥੧॥",
        transliteration: "naanak raahu pachhaaneh sei ||1||",
        translation: "O Nanak, he knows the Path. ||1||",
      },
    ],
    structure: [
      "Exposes spiritual theatre and empty status markers.",
      "Refuses to honor appearances disconnected from truth.",
      "Names a plain ethical path of labor and generosity.",
    ],
    keyVerseIds: [53369, 53371, 53372],
    relatedGuidanceIds: ["guidance-work-and-give"],
    relatedTopicIds: ["topic-seva", "topic-discipline", "topic-purpose"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("discipline", "growing", 30, 7, "discipline"),
  },
  {
    id: "shabad-detached-and-steady",
    title: "Steady Beyond Praise and Possession",
    subtitle: "Raag Gauree",
    summary: "Guru Tegh Bahadur describes inner steadiness in a world of praise, blame, greed, and attachment.",
    whyItMatters: "It helps users facing comparison, attachment, or emotional volatility see what grounded freedom looks like in Gurbani terms.",
    takeaway: "Freedom is not numbness. It is steadiness before what usually hooks the mind.",
    themes: ["attachment", "comparison", "steadiness"],
    emotionalStates: ["hooked", "needy", "easily-shaken"],
    difficulty: "deep",
    estimatedMinutes: 8,
    lengthBand: "short",
    citation: citation(699, 220, "Guru Tegh Bahaadur Ji", "Raag Gauree", [9411, 9412, 9413, 9414, 9415, 9416, 9417, 9418]),
    lines: [
      {
        verseId: 9411,
        gurmukhi: "ਗਉੜੀ ਮਹਲਾ ੯ ॥",
        transliteration: "gauRee mahalaa nauvaa ||",
        translation: "Gauree, Ninth Mehla:",
      },
      {
        verseId: 9412,
        gurmukhi: "ਸਾਧੋ ਰਾਮ ਸਰਨਿ ਬਿਸਰਾਮਾ ॥",
        transliteration: "saadho raam saran bisaraamaa ||",
        translation: "Holy Saadhus: rest and peace are in the Sanctuary of the Lord.",
      },
      {
        verseId: 9413,
        gurmukhi: "ਬੇਦ ਪੁਰਾਨ ਪੜੇ ਕੋ ਇਹ ਗੁਨ ਸਿਮਰੇ ਹਰਿ ਕੋ ਨਾਮਾ ॥੧॥ ਰਹਾਉ ॥",
        transliteration: "bedh puraan paRe ko ieh gun simare har ko naamaa ||1|| rahaau ||",
        translation: "This is the blessing of studying the Vedas and the Puraanas, that you may meditate on the Name of the Lord. ||1||Pause||",
      },
      {
        verseId: 9414,
        gurmukhi: "ਲੋਭ ਮੋਹ ਮਾਇਆ ਮਮਤਾ ਫੁਨਿ ਅਉ ਬਿਖਿਅਨ ਕੀ ਸੇਵਾ ॥ ਹਰਖ ਸੋਗ ਪਰਸੈ ਜਿਹ ਨਾਹਨਿ ਸੋ ਮੂਰਤਿ ਹੈ ਦੇਵਾ ॥੧॥",
        transliteration: "lobh moh maiaa mamataa fun aau bikhian kee sevaa || harakh sog parasai jeh naahan so moorat hai dhevaa ||1||",
        translation: "Greed, emotional attachment to Maya, possessiveness, the service of evil, pleasure and pain - those who are not touched by these, are the very embodiment of the Divine Lord. ||1||",
      },
      {
        verseId: 9415,
        gurmukhi: "ਸੁਰਗ ਨਰਕ ਅੰਮ੍ਰਿਤ ਬਿਖੁ ਏ ਸਭ ਤਿਉ ਕੰਚਨ ਅਰੁ ਪੈਸਾ ॥",
        transliteration: "surag narak a(n)mirat bikh e sabh tiau ka(n)chan ar paisaa ||",
        translation: "Heaven and hell, ambrosial nectar and poison, gold and copper - these are all alike to them.",
      },
      {
        verseId: 9416,
        gurmukhi: "ਉਸਤਤਿ ਨਿੰਦਾ ਏ ਸਮ ਜਾ ਕੈ ਲੋਭੁ ਮੋਹੁ ਫੁਨਿ ਤੈਸਾ ॥੨॥",
        transliteration: "ausatat ni(n)dhaa e sam jaa kai lobh moh fun taisaa ||2||",
        translation: "Praise and slander are all the same to them, as are greed and attachment. ||2||",
      },
      {
        verseId: 9417,
        gurmukhi: "ਦੁਖੁ ਸੁਖੁ ਏ ਬਾਧੇ ਜਿਹ ਨਾਹਨਿ ਤਿਹ ਤੁਮ ਜਾਨਉ ਗਿਆਨੀ ॥",
        transliteration: "dhukh sukh e baadhe jeh naahan teh tum jaanau giaanee ||",
        translation: "They are not bound by pleasure and pain - know that they are truly wise.",
      },
      {
        verseId: 9418,
        gurmukhi: "ਨਾਨਕ ਮੁਕਤਿ ਤਾਹਿ ਤੁਮ ਮਾਨਉ ਇਹ ਬਿਧਿ ਕੋ ਜੋ ਪ੍ਰਾਨੀ ॥੩॥੭॥",
        transliteration: "naanak mukat taeh tum maanau ieh bidh ko jo praanee ||3||7||",
        translation: "O Nanak, recognize those mortal beings as liberated, who live this way of life. ||3||7||",
      },
    ],
    structure: [
      "Locates real rest in the Lord's sanctuary.",
      "Describes the hooks that usually bind the mind: greed, attachment, praise, blame, pleasure, pain.",
      "Names steadiness across those hooks as a sign of wisdom and freedom.",
    ],
    keyVerseIds: [9412, 9414, 9416, 9417],
    relatedGuidanceIds: ["guidance-praise-and-blame"],
    relatedTopicIds: ["topic-attachment", "topic-comparison", "topic-gratitude"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("attachment", "deep", 30, 7, "reflection"),
  },
]

export const DAILY_GUIDANCE_ENTRIES: DailyGuidance[] = [
  {
    id: "guidance-hukam",
    title: "Begin inside Hukam",
    summary: "The day is not waiting for your control before it becomes livable.",
    takeaway: "You can meet what arrives without pretending you authored it.",
    lifeApplication: "Before reacting, name one thing already here that you need to stop fighting.",
    source: ref(
      "shabad-hukam-inside-everything",
      [11, 15],
      "Everything stands inside Hukam, not outside it.",
      "Release the demand that peace must wait for total control."
    ),
    relatedTopicIds: ["topic-anxiety", "topic-hukam"],
    relatedShabadIds: ["shabad-hukam-inside-everything"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("hukam", "beginner", 45, 10, "hukam"),
  },
  {
    id: "guidance-mind-mastery",
    title: "Win the inner field first",
    summary: "Guru does not tell you to dominate others. Guru tells you where the real contest lives.",
    takeaway: "If the mind is conquered, the rest stops feeling like war.",
    lifeApplication: "When comparison or anger rises, bring the battle back from the room to the mind.",
    source: ref(
      "shabad-conquer-the-mind",
      [292],
      "Conquering the mind matters more than conquering the world around you.",
      "Return your attention from other people to the state of your own mind."
    ),
    relatedTopicIds: ["topic-anger", "topic-comparison", "topic-discipline"],
    relatedShabadIds: ["shabad-conquer-the-mind"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("discipline", "growing", 45, 8, "discipline"),
  },
  {
    id: "guidance-human-opportunity",
    title: "This life is a chance, not just a schedule",
    summary: "Human birth is framed as an opening for meeting, sangat, and Naam.",
    takeaway: "Do not let busyness steal the point of being here.",
    lifeApplication: "Choose one practice today that treats life as an opportunity for meeting rather than maintenance.",
    source: ref(
      "shabad-human-birth-is-chance",
      [524, 525],
      "Human birth is given as the chance to meet the Divine.",
      "Let one part of the day answer that opportunity directly."
    ),
    relatedTopicIds: ["topic-purpose", "topic-discipline"],
    relatedShabadIds: ["shabad-human-birth-is-chance"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("purpose", "beginner", 45, 9, "challenge"),
  },
  {
    id: "guidance-sangat-and-naam",
    title: "Do not try to carry the whole path alone",
    summary: "This shabad moves immediately from opportunity to sangat and Naam.",
    takeaway: "Direction gets sturdier in holy company.",
    lifeApplication: "Reach for a place, person, or practice that reorients you toward sangat today.",
    source: ref(
      "shabad-human-birth-is-chance",
      [527],
      "Sangat and Naam are not extras; they are the practical path.",
      "Seek support that turns you toward remembrance, not just distraction."
    ),
    relatedTopicIds: ["topic-loneliness", "topic-purpose"],
    relatedShabadIds: ["shabad-human-birth-is-chance"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("sangat", "beginner", 45, 7, "comfort"),
  },
  {
    id: "guidance-selfless-service",
    title: "Let seva stop advertising you",
    summary: "Service changes meaning when the self is no longer trying to be seen through it.",
    takeaway: "Quiet service can carry more truth than visible service.",
    lifeApplication: "Choose one act of help today that does not need acknowledgement to feel worthwhile.",
    source: ref(
      "shabad-selfless-service",
      [12947, 12948],
      "Selfless service becomes a way of union, not a way of building a self-image.",
      "Serve without building a story about being the servant."
    ),
    relatedTopicIds: ["topic-seva", "topic-purpose"],
    relatedShabadIds: ["shabad-selfless-service"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("seva", "growing", 45, 9, "seva"),
  },
  {
    id: "guidance-obey-and-remember",
    title: "Obedience and remembrance belong together",
    summary: "This is not service as activity only. It is inward obedience and inward Naam.",
    takeaway: "Alignment matters more than motion.",
    lifeApplication: "Ask whether your effort today is actually aligned with Guru's direction or merely energetic.",
    source: ref(
      "shabad-selfless-service",
      [12942, 12944],
      "The Guru's servant is shaped by obedience and remembrance together.",
      "Let your outer work be held by inner remembrance."
    ),
    relatedTopicIds: ["topic-discipline", "topic-seva"],
    relatedShabadIds: ["shabad-selfless-service"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("discipline", "growing", 45, 7, "discipline"),
  },
  {
    id: "guidance-ego-cure",
    title: "Name ego as illness",
    summary: "The point is not self-hatred. The point is honest diagnosis.",
    takeaway: "What is named clearly can stop ruling secretly.",
    lifeApplication: "When you feel offended, ask what wound to the ego you are defending.",
    source: ref(
      "shabad-ego-is-disease",
      [20963, 20964],
      "Ego is a chronic disease, and Guru's Shabad becomes the cure through grace.",
      "Move from self-justification toward teachability."
    ),
    relatedTopicIds: ["topic-ego", "topic-anger"],
    relatedShabadIds: ["shabad-ego-is-disease"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("ego", "growing", 45, 9, "challenge"),
  },
  {
    id: "guidance-suffering-as-medicine",
    title: "Hard seasons can wake what comfort numbs",
    summary: "Guru is not praising pain for its own sake. Guru is exposing what comfort often hides.",
    takeaway: "A difficult day can still become a truthful day.",
    lifeApplication: "Instead of asking only how to escape the discomfort, ask what it is uncovering.",
    source: ref(
      "shabad-suffering-as-medicine",
      [21090],
      "Suffering can become medicine when it returns the mind to reality and remembrance.",
      "Let pain open dependence instead of only resentment."
    ),
    relatedTopicIds: ["topic-anxiety", "topic-gratitude", "topic-attachment"],
    relatedShabadIds: ["shabad-suffering-as-medicine"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("reflection", "growing", 45, 8, "reflection"),
  },
  {
    id: "guidance-the-creator-acts",
    title: "You are not the sole actor in this moment",
    summary: "The shabad turns the mind away from self-importance and back toward the Creator's action.",
    takeaway: "Rest is possible when you stop carrying authorship that was never yours.",
    lifeApplication: "Where are you exhausting yourself by behaving as if everything depends on you alone?",
    source: ref(
      "shabad-suffering-as-medicine",
      [21091, 21096],
      "The Creator acts; the seeker is called into surrender and praise.",
      "Let surrender interrupt false urgency."
    ),
    relatedTopicIds: ["topic-anxiety", "topic-hukam"],
    relatedShabadIds: ["shabad-suffering-as-medicine"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("hukam", "growing", 45, 7, "hukam"),
  },
  {
    id: "guidance-fear-and-protection",
    title: "Fear does not get the last word",
    summary: "Guru meets wavering by reminding you whose care has carried you from the start.",
    takeaway: "The One who made you has not stepped back from you.",
    lifeApplication: "When fear spikes, repeat the line before you plan the entire future.",
    source: ref(
      "shabad-steadied-by-creator",
      [30988, 30989],
      "The Creator who formed you remains your support.",
      "Answer fear with remembrance before strategy."
    ),
    relatedTopicIds: ["topic-anxiety", "topic-loneliness"],
    relatedShabadIds: ["shabad-steadied-by-creator"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("anxiety", "beginner", 45, 10, "comfort"),
  },
  {
    id: "guidance-gratitude",
    title: "Gratitude begins with mercy, not achievement",
    summary: "This is not gratitude for being impressive. It is gratitude for being carried.",
    takeaway: "Mercy is the atmosphere of real gratitude.",
    lifeApplication: "Name one mercy you have been treating as ordinary.",
    source: ref(
      "shabad-gratitude-restores-naam",
      [60338, 60340],
      "Gratitude grows when the heart admits both unworthiness and mercy.",
      "Let thankfulness soften you instead of making you self-satisfied."
    ),
    relatedTopicIds: ["topic-gratitude", "topic-comparison"],
    relatedShabadIds: ["shabad-gratitude-restores-naam"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("gratitude", "beginner", 45, 9, "gratitude"),
  },
  {
    id: "guidance-cherished-child",
    title: "Bring your need like a child",
    summary: "Need does not disqualify you from the path. It becomes part of the prayer.",
    takeaway: "You do not have to become self-sufficient before seeking Guru.",
    lifeApplication: "Pray with plain need today instead of polished language.",
    source: ref(
      "shabad-child-of-grace",
      [3761, 3762, 3763],
      "The Guru is named as protector, mother, and father.",
      "Bring loneliness and dependence into prayer without embarrassment."
    ),
    relatedTopicIds: ["topic-loneliness", "topic-anxiety"],
    relatedShabadIds: ["shabad-child-of-grace"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("loneliness", "beginner", 45, 8, "comfort"),
  },
  {
    id: "guidance-remember-and-find-peace",
    title: "Repeat remembrance until it starts to hold you",
    summary: "The shabad is repetitive on purpose. Peace is cultivated by returning again.",
    takeaway: "Remembrance is a rhythm, not a one-time correction.",
    lifeApplication: "Choose one short simran phrase and return to it instead of feeding the same anxious loop.",
    source: ref(
      "shabad-remembrance-brings-peace",
      [11502, 11503],
      "Peace comes through repeated remembrance, not through endless mental churn.",
      "Interrupt worry with repetition that re-roots the heart."
    ),
    relatedTopicIds: ["topic-anxiety", "topic-discipline"],
    relatedShabadIds: ["shabad-remembrance-brings-peace"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("anxiety", "beginner", 45, 9, "comfort"),
  },
  {
    id: "guidance-work-and-give",
    title: "Honest work is spiritual texture",
    summary: "Guru cuts through posturing and gives a plain path: labor honestly and share.",
    takeaway: "Truth is lived in how you earn and how you open your hand.",
    lifeApplication: "Let one concrete act of generosity become part of your workday, not separate from it.",
    source: ref(
      "shabad-work-give-know-the-path",
      [53371, 53372],
      "The path is recognized in honest labor and generosity.",
      "Do not separate devotion from the ethics of work and giving."
    ),
    relatedTopicIds: ["topic-seva", "topic-purpose", "topic-discipline"],
    relatedShabadIds: ["shabad-work-give-know-the-path"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("seva", "growing", 45, 7, "seva"),
  },
  {
    id: "guidance-praise-and-blame",
    title: "Praise and blame do not need to run your day",
    summary: "Steadiness grows when the mind stops needing approval and fearing dismissal.",
    takeaway: "Inner stability is stronger than public reaction.",
    lifeApplication: "Notice where today's mood is still being outsourced to other people's opinions.",
    source: ref(
      "shabad-detached-and-steady",
      [9416, 9417],
      "Steadiness is seen in not being bound by praise, blame, pleasure, or pain.",
      "Let feedback inform you without governing your worth."
    ),
    relatedTopicIds: ["topic-comparison", "topic-attachment", "topic-ego"],
    relatedShabadIds: ["shabad-detached-and-steady"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("attachment", "deep", 45, 6, "reflection"),
  },
  {
    id: "guidance-honor-what-guru-honors",
    title: "Do not speak with contempt where Guru speaks with honor",
    summary: "This is a corrective for inherited disrespect and casual dismissal.",
    takeaway: "Guru's language should shape your social instincts too.",
    lifeApplication: "Examine one attitude you carry that Gurbani would ask you to unlearn.",
    source: ref(
      "shabad-honor-women",
      [21287, 21289],
      "Guru Nanak directly rejects contempt toward women.",
      "Let reverence revise the way you speak about people."
    ),
    relatedTopicIds: ["topic-anger", "topic-comparison"],
    relatedShabadIds: ["shabad-honor-women"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("equality", "beginner", 45, 5, "challenge"),
  },
]

export const TOPIC_GUIDES: TopicGuide[] = [
  {
    id: "topic-anxiety",
    title: "When the mind is anxious",
    shortTitle: "Anxiety",
    category: "most-needed",
    issueStatement: "The mind keeps rehearsing danger, trying to secure the future before it arrives.",
    centralInsight: "Guru does not ask you to pretend fear is unreal. Guru asks you to remember whose care you already stand inside.",
    practicalReflection: "Anxiety narrows attention to imagined futures. Gurbani widens it back toward Hukam, remembrance, and the Creator's care.",
    actionPrompt: "Read one line aloud three times before you try to solve everything. Let remembrance come before planning.",
    searchTerms: ["anxiety", "stress", "overthinking", "worry", "panic", "fear", "restless"],
    excerpts: [
      {
        source: ref(
          "shabad-steadied-by-creator",
          [30988, 30989],
          "The Creator who made you remains your support.",
          "Fear loses some of its authority when creation and care are remembered together."
        ),
        explanation: "The line does not argue your fear away. It interrupts fear's claim to total control.",
      },
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [15, 16],
          "Everything stands inside Hukam, and understanding that loosens ego.",
          "The mind relaxes when it stops demanding a reality outside Hukam."
        ),
        explanation: "Anxiety often wants certainty outside Hukam. Guru turns the mind back toward trust inside it.",
      },
      {
        source: ref(
          "shabad-remembrance-brings-peace",
          [11502, 11503],
          "Repeated remembrance steadies the body and mind.",
          "Return is the practice; peace grows through repetition."
        ),
        explanation: "This is practical medicine for spiraling thought. The repetition is part of the guidance.",
      },
    ],
    relatedShabadIds: [
      "shabad-steadied-by-creator",
      "shabad-hukam-inside-everything",
      "shabad-remembrance-brings-peace",
    ],
    relatedTopicIds: ["topic-hukam", "topic-loneliness"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("anxiety", "beginner", 21, 10, "comfort"),
  },
  {
    id: "topic-anger",
    title: "When anger takes over",
    shortTitle: "Anger",
    category: "most-needed",
    issueStatement: "Anger feels immediate and justified, but it often rides on hurt pride, attachment, and the refusal to let the mind be taught.",
    centralInsight: "Guru addresses anger by going underneath it: ego, self-display, and the unconquered mind.",
    practicalReflection: "The question is not only what provoked you. The question is what inside you was ruling the moment before the reaction came.",
    actionPrompt: "Before sending, saying, or escalating something, ask: what am I protecting here besides truth?",
    searchTerms: ["anger", "frustration", "reactive", "rage", "irritation", "offended"],
    excerpts: [
      {
        source: ref(
          "shabad-ego-is-disease",
          [20961, 20963, 20964],
          "Ego is the disease; Guru's Shabad becomes the cure through grace.",
          "Anger often survives by convincing you it is pure clarity rather than wounded ego."
        ),
        explanation: "Guru Angad shifts the question from the target of anger to the condition of the self carrying it.",
      },
      {
        source: ref(
          "shabad-conquer-the-mind",
          [292],
          "The real victory is inner victory.",
          "What feels like domination of the moment is often failure to govern the mind."
        ),
        explanation: "This line resets the field of conflict. The unconquered mind makes every room harder.",
      },
      {
        source: ref(
          "shabad-selfless-service",
          [12943, 12944],
          "Do not call attention to yourself; keep Naam in the heart.",
          "The self that demands notice is often the same self that flares in anger."
        ),
        explanation: "Humility and remembrance are direct medicine for reactivity.",
      },
    ],
    relatedShabadIds: ["shabad-ego-is-disease", "shabad-conquer-the-mind", "shabad-selfless-service"],
    relatedTopicIds: ["topic-ego", "topic-comparison"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("anger", "growing", 21, 8, "challenge"),
  },
  {
    id: "topic-ego",
    title: "When ego keeps narrating everything",
    shortTitle: "Ego",
    category: "most-needed",
    issueStatement: "Everything comes back to me: my image, my hurt, my control, my place.",
    centralInsight: "Gurbani does not treat ego as personality. It treats ego as disease, bondage, and distortion.",
    practicalReflection: "The goal is not self-erasure. It is truthful self-placement inside Hukam and Guru's Shabad.",
    actionPrompt: "Notice one sentence in your head today that begins and ends with the self. Lay it beside the shabad honestly.",
    searchTerms: ["ego", "haumai", "pride", "self-importance", "defensive"],
    excerpts: [
      {
        source: ref(
          "shabad-ego-is-disease",
          [20959, 20963],
          "Ego shapes action and becomes chronic illness.",
          "Seeing ego clearly is part of grace, not failure."
        ),
        explanation: "Guru Angad is exact: ego is not a small flaw on top of an otherwise neutral self.",
      },
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [16],
          "Understanding Hukam loosens ego's speech.",
          "The self becomes quieter when reality is no longer centered around it."
        ),
        explanation: "Hukam is not abstract theology here. It is a direct solvent for haumai.",
      },
      {
        source: ref(
          "shabad-gratitude-restores-naam",
          [60338, 60339],
          "Real gratitude lowers the self before mercy.",
          "Mercy becomes visible when self-importance thins out."
        ),
        explanation: "Humility here is not performative modesty. It is truthful dependence.",
      },
    ],
    relatedShabadIds: ["shabad-ego-is-disease", "shabad-hukam-inside-everything", "shabad-gratitude-restores-naam"],
    relatedTopicIds: ["topic-anger", "topic-comparison"],
    relatedCollectionIds: ["collection-ego-to-humility"],
    rotation: rotation("ego", "growing", 21, 9, "challenge"),
  },
  {
    id: "topic-loneliness",
    title: "When you feel alone",
    shortTitle: "Loneliness",
    category: "most-needed",
    issueStatement: "The heart feels unheld, unseen, or left to carry too much alone.",
    centralInsight: "Guru turns loneliness toward sangat, Guru-care, and the Creator's nearness rather than toward self-enclosed despair.",
    practicalReflection: "Loneliness narrows the world. Gurbani widens it again by locating you in sangat, in prayer, and in the Lord's ongoing care.",
    actionPrompt: "Reach outward in one spiritually honest way today: sangat, message, prayer, or presence.",
    searchTerms: ["loneliness", "alone", "isolated", "unseen", "disconnected"],
    excerpts: [
      {
        source: ref(
          "shabad-child-of-grace",
          [3760, 3762, 3763],
          "Sangat and Guru-care are the place of belonging.",
          "Need can become prayer instead of silent isolation."
        ),
        explanation: "This shabad does not shame dependence. It redirects it toward Guru.",
      },
      {
        source: ref(
          "shabad-steadied-by-creator",
          [30985, 30991],
          "The Merciful One is already present in every heart.",
          "Aloneness is interrupted by nearness before circumstances change."
        ),
        explanation: "The line answers loneliness not with abstraction but with presence.",
      },
      {
        source: ref(
          "shabad-human-birth-is-chance",
          [527],
          "Sangat and Naam are the practical way forward.",
          "Belonging is cultivated in holy company, not only felt spontaneously."
        ),
        explanation: "Guru makes companionship a practice, not just a wish.",
      },
    ],
    relatedShabadIds: ["shabad-child-of-grace", "shabad-steadied-by-creator", "shabad-human-birth-is-chance"],
    relatedTopicIds: ["topic-anxiety", "topic-purpose"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("loneliness", "beginner", 21, 8, "comfort"),
  },
  {
    id: "topic-discipline",
    title: "When you need discipline, not more mood",
    shortTitle: "Discipline",
    category: "practice",
    issueStatement: "You know what matters, but drift, distraction, and emotional weather keep deciding the day.",
    centralInsight: "Guru's path is not built on mood. It is built on chosen practice, obedience, remembrance, and inner conquest.",
    practicalReflection: "Discipline in Gurbani is not harsh self-management. It is the willingness to live by what is true before it feels easy.",
    actionPrompt: "Choose the smallest faithful next practice and do it before you renegotiate with yourself.",
    searchTerms: ["discipline", "consistency", "habit", "focus", "motivation"],
    excerpts: [
      {
        source: ref(
          "shabad-conquer-the-mind",
          [290, 292],
          "Contentment and inner conquest define the real path.",
          "Outer identity cannot replace inner discipline."
        ),
        explanation: "Guru Nanak redefines discipline as an interior ordering of life.",
      },
      {
        source: ref(
          "shabad-human-birth-is-chance",
          [528, 529],
          "Effort matters because life can be wasted.",
          "Discipline is compassion toward the chance this life holds."
        ),
        explanation: "The warning against waste is not panic. It is urgency with spiritual purpose.",
      },
      {
        source: ref(
          "shabad-selfless-service",
          [12942, 12944],
          "Obedience and remembrance anchor practice.",
          "Discipline without remembrance becomes dry willpower."
        ),
        explanation: "The Guru's Commands and Naam are held together here.",
      },
    ],
    relatedShabadIds: ["shabad-conquer-the-mind", "shabad-human-birth-is-chance", "shabad-selfless-service"],
    relatedTopicIds: ["topic-purpose", "topic-seva"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("discipline", "growing", 21, 8, "discipline"),
  },
  {
    id: "topic-gratitude",
    title: "When gratitude feels thin or forced",
    shortTitle: "Gratitude",
    category: "practice",
    issueStatement: "You may know you should be grateful, but the heart feels dull, entitled, or too occupied with what is missing.",
    centralInsight: "Gurbani deepens gratitude by moving through unworthiness, mercy, and Naam instead of through self-congratulation.",
    practicalReflection: "Gratitude becomes truer when it stops being a performance of positivity and becomes recognition of mercy.",
    actionPrompt: "Name one mercy beneath the surface event: guidance, restraint, sangat, forgiveness, or breath itself.",
    searchTerms: ["gratitude", "thankful", "contentment", "blessing"],
    excerpts: [
      {
        source: ref(
          "shabad-gratitude-restores-naam",
          [60338, 60340, 60341],
          "Mercy, Guru, and Naam are the deeper structure of gratitude.",
          "Thankfulness here leads back into spiritual life, not only good feelings."
        ),
        explanation: "This shabad gives gratitude depth by rooting it in mercy.",
      },
      {
        source: ref(
          "shabad-suffering-as-medicine",
          [21090, 21095],
          "Pain can re-open praise where comfort forgets.",
          "Gratitude sometimes grows after false securities are shaken."
        ),
        explanation: "Guru Nanak reframes comfort and difficulty without flattening either.",
      },
      {
        source: ref(
          "shabad-detached-and-steady",
          [9416, 9417],
          "Steadiness makes room for gratitude beyond circumstance.",
          "A grateful heart is less ruled by praise, blame, pleasure, or pain."
        ),
        explanation: "Gratitude gets sturdier when the mind is less hooked by swings.",
      },
    ],
    relatedShabadIds: ["shabad-gratitude-restores-naam", "shabad-suffering-as-medicine", "shabad-detached-and-steady"],
    relatedTopicIds: ["topic-attachment", "topic-comparison"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("gratitude", "beginner", 21, 8, "gratitude"),
  },
  {
    id: "topic-purpose",
    title: "When you are asking what this life is for",
    shortTitle: "Purpose",
    category: "most-needed",
    issueStatement: "Life feels busy but unclear, full but underdirected.",
    centralInsight: "Guru frames purpose around meeting, sangat, Naam, and seva rather than around self-invention alone.",
    practicalReflection: "Purpose gets clearer when the question shifts from what will make me feel impressive to what brings me nearer to truth and service.",
    actionPrompt: "Let one decision today answer the question: does this move me toward meeting, service, or only self-expansion?",
    searchTerms: ["purpose", "meaning", "calling", "direction", "why am i here"],
    excerpts: [
      {
        source: ref(
          "shabad-human-birth-is-chance",
          [524, 525, 527],
          "Human life is given as the chance to meet through sangat and Naam.",
          "Purpose begins with what this life is for in Guru's framing, not only in yours."
        ),
        explanation: "Guru Arjan makes the orientation clear from the opening lines.",
      },
      {
        source: ref(
          "shabad-selfless-service",
          [12947, 12948],
          "Seva is not accessory to the path; it is one way of union.",
          "Purpose matures when it opens outward in selfless service."
        ),
        explanation: "Nishkaam seva is a spiritual answer, not just an ethical one.",
      },
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [11, 16],
          "Purpose grows clearer inside Hukam and softer ego.",
          "Direction is easier to hear when control loosens."
        ),
        explanation: "Purpose is not only found through intensity; it is also received through surrender.",
      },
    ],
    relatedShabadIds: ["shabad-human-birth-is-chance", "shabad-selfless-service", "shabad-hukam-inside-everything"],
    relatedTopicIds: ["topic-seva", "topic-discipline"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("purpose", "beginner", 21, 8, "challenge"),
  },
  {
    id: "topic-comparison",
    title: "When comparison keeps shrinking the heart",
    shortTitle: "Comparison",
    category: "most-needed",
    issueStatement: "Other people's success, beauty, attention, or place becomes the measure of your own worth.",
    centralInsight: "Comparison thrives where the mind is unconquered, ego is unexamined, and praise or blame still decide identity.",
    practicalReflection: "Guru does not simply say stop comparing. Guru shows the deeper conditions that make comparison persuasive.",
    actionPrompt: "When comparison begins, bring the gaze back from another person's lane to the condition of your own mind.",
    searchTerms: ["comparison", "jealousy", "envy", "insecurity", "validation"],
    excerpts: [
      {
        source: ref(
          "shabad-conquer-the-mind",
          [290, 292],
          "Contentment and inner conquest oppose comparison's hunger.",
          "The mind looking outward for ranking has not yet settled inwardly."
        ),
        explanation: "Contentment is not passive here. It is active protection against endless ranking.",
      },
      {
        source: ref(
          "shabad-ego-is-disease",
          [20959, 20963],
          "Ego drives action and distorts value.",
          "Comparison is often ego asking to be reassured."
        ),
        explanation: "The disease language helps comparison feel less noble and more diagnosable.",
      },
      {
        source: ref(
          "shabad-detached-and-steady",
          [9416, 9417],
          "Praise and blame no longer determine steadiness.",
          "Comparison weakens when approval and status lose some power."
        ),
        explanation: "Guru Tegh Bahadur gives a picture of freedom from social hooks.",
      },
    ],
    relatedShabadIds: ["shabad-conquer-the-mind", "shabad-ego-is-disease", "shabad-detached-and-steady"],
    relatedTopicIds: ["topic-ego", "topic-gratitude"],
    relatedCollectionIds: ["collection-gratitude-and-contentment", "collection-ego-to-humility"],
    rotation: rotation("comparison", "growing", 21, 7, "challenge"),
  },
  {
    id: "topic-attachment",
    title: "When attachment keeps hooking the mind",
    shortTitle: "Attachment",
    category: "inner-work",
    issueStatement: "The heart feels dragged around by approval, comfort, possession, or a version of life you do not want to lose.",
    centralInsight: "Attachment is not only affection. In Gurbani it is the mind becoming bound to what cannot hold the weight you place on it.",
    practicalReflection: "Attachment is revealed by the force of your reactions: what you cannot imagine losing without collapse often owns more of you than you realize.",
    actionPrompt: "Name the thing whose fluctuation keeps deciding your inner state. Bring that honestly into prayer.",
    searchTerms: ["attachment", "clingy", "possessive", "can't let go", "fixated"],
    excerpts: [
      {
        source: ref(
          "shabad-suffering-as-medicine",
          [21090, 21091],
          "Pleasure can become the very place where desire for God thins out.",
          "Attachment often hides inside the comfort you least want disturbed."
        ),
        explanation: "Guru Nanak links attachment to the sedating power of unchecked comfort.",
      },
      {
        source: ref(
          "shabad-detached-and-steady",
          [9414, 9416],
          "Greed, attachment, praise, and blame lose their grip in steadiness.",
          "Freedom is pictured as not being constantly touched by these hooks."
        ),
        explanation: "This shabad describes what the unhooked heart looks like.",
      },
      {
        source: ref(
          "shabad-gratitude-restores-naam",
          [60338, 60341],
          "Mercy and Naam loosen the heart's dependence on lesser securities.",
          "Attachment weakens when life is received as gift, not possession."
        ),
        explanation: "The movement from mercy to Naam offers a healthier center of trust.",
      },
    ],
    relatedShabadIds: ["shabad-suffering-as-medicine", "shabad-detached-and-steady", "shabad-gratitude-restores-naam"],
    relatedTopicIds: ["topic-gratitude", "topic-comparison"],
    relatedCollectionIds: ["collection-gratitude-and-contentment"],
    rotation: rotation("attachment", "deep", 21, 7, "reflection"),
  },
  {
    id: "topic-seva",
    title: "When you want to live in seva",
    shortTitle: "Seva",
    category: "practice",
    issueStatement: "You want your life to be useful, but service can easily become busy identity or burnout.",
    centralInsight: "Guru joins seva with humility, obedience, hiddenness, and remembrance. Seva is not just effort. It is a spiritual way of being.",
    practicalReflection: "Useful work without inner alignment can harden the self. Nishkaam seva opens it.",
    actionPrompt: "Choose one act of service today that is faithful, sustainable, and not secretly hungry for praise.",
    searchTerms: ["seva", "service", "serve", "help others", "volunteer"],
    excerpts: [
      {
        source: ref(
          "shabad-selfless-service",
          [12943, 12947, 12948],
          "Hiddenness and reward-free service define true seva.",
          "Seva is not self-display with religious vocabulary."
        ),
        explanation: "This is the clearest direct line in the catalog on nishkaam seva.",
      },
      {
        source: ref(
          "shabad-work-give-know-the-path",
          [53371, 53372],
          "Honest work and giving are part of the path itself.",
          "Seva is not separate from how you earn and share."
        ),
        explanation: "Guru Nanak gives seva concrete ethical shape.",
      },
      {
        source: ref(
          "shabad-human-birth-is-chance",
          [524, 527],
          "Human life is an opportunity for meeting and holy company.",
          "Seva makes sense when life is understood as purposeful gift."
        ),
        explanation: "Purpose and seva strengthen each other in this framing.",
      },
    ],
    relatedShabadIds: ["shabad-selfless-service", "shabad-work-give-know-the-path", "shabad-human-birth-is-chance"],
    relatedTopicIds: ["topic-purpose", "topic-discipline"],
    relatedCollectionIds: ["collection-service-and-purpose"],
    rotation: rotation("seva", "growing", 21, 8, "seva"),
  },
  {
    id: "topic-hukam",
    title: "When you need to return to Hukam",
    shortTitle: "Hukam",
    category: "inner-work",
    issueStatement: "The mind is pushing hard against reality, trying to secure itself through control, explanation, or resistance.",
    centralInsight: "Hukam is not fatalism. It is the truthful frame within which the self becomes quieter and more teachable.",
    practicalReflection: "Hukam does not erase action. It purifies the spirit in which action happens.",
    actionPrompt: "Name where you are acting faithfully and where you are merely fighting what already is.",
    searchTerms: ["hukam", "control", "surrender", "acceptance", "why is this happening"],
    excerpts: [
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [11, 15, 16],
          "Everything stands inside Hukam, and understanding that quiets ego.",
          "The shift is not passivity. It is re-entering reality as it is."
        ),
        explanation: "This is the core Hukam text in the current catalog.",
      },
      {
        source: ref(
          "shabad-suffering-as-medicine",
          [21091, 21096],
          "The Creator acts beyond the self's imagined authorship.",
          "Hukam softens the belief that everything rests on your own force."
        ),
        explanation: "These lines help Hukam feel lived, not theoretical.",
      },
      {
        source: ref(
          "shabad-steadied-by-creator",
          [30988, 30990],
          "The Creator who made the world also tends it.",
          "Trust in Hukam becomes easier when care is remembered alongside command."
        ),
        explanation: "The world is not merely governed; it is also cared for.",
      },
    ],
    relatedShabadIds: ["shabad-hukam-inside-everything", "shabad-suffering-as-medicine", "shabad-steadied-by-creator"],
    relatedTopicIds: ["topic-anxiety", "topic-purpose"],
    relatedCollectionIds: ["collection-fear-to-trust"],
    rotation: rotation("hukam", "beginner", 21, 8, "hukam"),
  },
]

export const COLLECTIONS: Collection[] = [
  {
    id: "collection-fear-to-trust",
    title: "From Fear to Trust",
    subtitle: "A steadier week for anxious hearts",
    description: "Move from panic and wavering toward Hukam, remembrance, and the Creator's care.",
    durationLabel: "5-day journey",
    themes: ["anxiety", "hukam", "trust"],
    heroSource: ref(
      "shabad-steadied-by-creator",
      [30988],
      "The Creator will protect you.",
      "Let this line become the tone of the whole journey."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-fear-and-protection" },
      { kind: "topic-guide", id: "topic-anxiety" },
      { kind: "shabad-deep-dive", id: "shabad-steadied-by-creator" },
      { kind: "shabad-deep-dive", id: "shabad-hukam-inside-everything" },
      { kind: "shabad-deep-dive", id: "shabad-remembrance-brings-peace" },
    ],
    relatedTopicIds: ["topic-anxiety", "topic-hukam", "topic-loneliness"],
    relatedShabadIds: [
      "shabad-steadied-by-creator",
      "shabad-hukam-inside-everything",
      "shabad-remembrance-brings-peace",
    ],
  },
  {
    id: "collection-ego-to-humility",
    title: "From Ego to Humility",
    subtitle: "A study path for self-importance and reactivity",
    description: "Trace how haumai shows up, how it distorts the mind, and how Guru redirects it.",
    durationLabel: "5-day journey",
    themes: ["ego", "anger", "comparison"],
    heroSource: ref(
      "shabad-ego-is-disease",
      [20963],
      "Ego is a chronic disease, but it contains its own cure.",
      "Let diagnosis become the beginning of mercy, not shame."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-ego-cure" },
      { kind: "topic-guide", id: "topic-ego" },
      { kind: "topic-guide", id: "topic-anger" },
      { kind: "shabad-deep-dive", id: "shabad-ego-is-disease" },
      { kind: "shabad-deep-dive", id: "shabad-conquer-the-mind" },
    ],
    relatedTopicIds: ["topic-ego", "topic-anger", "topic-comparison"],
    relatedShabadIds: ["shabad-ego-is-disease", "shabad-conquer-the-mind", "shabad-honor-women"],
  },
  {
    id: "collection-gratitude-and-contentment",
    title: "Gratitude and Contentment",
    subtitle: "A slower path out of grasping",
    description: "Study how mercy, steadiness, and truthful perspective loosen attachment and deepen gratitude.",
    durationLabel: "5-day journey",
    themes: ["gratitude", "attachment", "reflection"],
    heroSource: ref(
      "shabad-gratitude-restores-naam",
      [60338],
      "I have not appreciated what You have done for me.",
      "Let gratitude begin in honest recognition, not polished language."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-gratitude" },
      { kind: "topic-guide", id: "topic-gratitude" },
      { kind: "topic-guide", id: "topic-attachment" },
      { kind: "shabad-deep-dive", id: "shabad-gratitude-restores-naam" },
      { kind: "shabad-deep-dive", id: "shabad-detached-and-steady" },
    ],
    relatedTopicIds: ["topic-gratitude", "topic-attachment", "topic-comparison"],
    relatedShabadIds: ["shabad-gratitude-restores-naam", "shabad-detached-and-steady", "shabad-suffering-as-medicine"],
  },
  {
    id: "collection-service-and-purpose",
    title: "Service and Purpose",
    subtitle: "A practical path for meaningful living",
    description: "Return to why this life was given and how seva, sangat, work, and Naam clarify purpose.",
    durationLabel: "6-day journey",
    themes: ["purpose", "seva", "discipline"],
    heroSource: ref(
      "shabad-human-birth-is-chance",
      [524, 525],
      "This human body has been given to you. This is your chance to meet the Divine.",
      "Let purpose begin with Guru's framing of life."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-human-opportunity" },
      { kind: "topic-guide", id: "topic-purpose" },
      { kind: "topic-guide", id: "topic-seva" },
      { kind: "shabad-deep-dive", id: "shabad-human-birth-is-chance" },
      { kind: "shabad-deep-dive", id: "shabad-selfless-service" },
      { kind: "shabad-deep-dive", id: "shabad-work-give-know-the-path" },
    ],
    relatedTopicIds: ["topic-purpose", "topic-seva", "topic-discipline"],
    relatedShabadIds: [
      "shabad-human-birth-is-chance",
      "shabad-selfless-service",
      "shabad-work-give-know-the-path",
    ],
  },
]

export const SHABAD_DEEP_DIVE_BY_ID = Object.fromEntries(
  SHABAD_DEEP_DIVES.map(item => [item.id, item] as const)
) satisfies Record<string, ShabadDeepDive>

export const DAILY_GUIDANCE_BY_ID = Object.fromEntries(
  DAILY_GUIDANCE_ENTRIES.map(item => [item.id, item] as const)
) satisfies Record<string, DailyGuidance>

export const TOPIC_GUIDE_BY_ID = Object.fromEntries(
  TOPIC_GUIDES.map(item => [item.id, item] as const)
) satisfies Record<string, TopicGuide>

export const COLLECTION_BY_ID = Object.fromEntries(
  COLLECTIONS.map(item => [item.id, item] as const)
) satisfies Record<string, Collection>

export function getLearnItemKind(itemId: string): LearnContentKind | null {
  if (itemId in DAILY_GUIDANCE_BY_ID) return "daily-guidance"
  if (itemId in SHABAD_DEEP_DIVE_BY_ID) return "shabad-deep-dive"
  if (itemId in TOPIC_GUIDE_BY_ID) return "topic-guide"
  if (itemId in COLLECTION_BY_ID) return "collection"
  return null
}
