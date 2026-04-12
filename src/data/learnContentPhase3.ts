import type {
  Collection,
  DailyGuidance,
  LearnLineReference,
  RotationMetadata,
  ShabadDeepDive,
  SourceCitation,
  TopicGuide,
} from "../types"

type LegacyTopicGuide = Omit<TopicGuide, "defaultScenarioKey" | "scenarioOrder" | "scenarios">

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

export const PHASE_THREE_LEARN_SEARCH_SYNONYMS: Record<string, string> = {
  control: "topic-control",
  controlling: "topic-control",
  micromanaging: "topic-control",
  "can't let go": "topic-control",
  outcomes: "topic-control",
  shame: "topic-shame",
  guilty: "topic-shame",
  unworthy: "topic-shame",
  "self-loathing": "topic-shame",
  regret: "topic-shame",
  fear: "topic-fear",
  afraid: "topic-fear",
  scared: "topic-fear",
  dread: "topic-fear",
  insecurity: "topic-fear",
  honesty: "topic-honesty",
  integrity: "topic-honesty",
  truthfulness: "topic-honesty",
  crooked: "topic-honesty",
  compromise: "topic-honesty",
  searching: "topic-seeking",
  wandering: "topic-seeking",
  seeking: "topic-seeking",
  "can't settle": "topic-seeking",
  "spiritually lost": "topic-seeking",
  worthless: "topic-self-worth",
  "not enough": "topic-self-worth",
  unwanted: "topic-self-worth",
  unseen: "topic-self-worth",
  rejected: "topic-self-worth",
  softness: "topic-softness",
  gentle: "topic-softness",
  harsh: "topic-softness",
  tenderness: "topic-softness",
  "cutting words": "topic-softness",
  exhausted: "topic-exhaustion",
  "burnt out": "topic-exhaustion",
  tired: "topic-exhaustion",
  drained: "topic-exhaustion",
  weary: "topic-exhaustion",
  conduct: "topic-conduct",
  hypocrisy: "topic-conduct",
  lifestyle: "topic-conduct",
  practice: "topic-conduct",
  "pure conduct": "topic-conduct",
}

export const PHASE_THREE_SHABAD_DEEP_DIVES: ShabadDeepDive[] = [
  {
    id: "shabad-patience-ripens-into-honor",
    title: "Patience Ripens Into Honor",
    subtitle: "Raag Gauree · Ang 257",
    summary: "This pauree joins saint company, true wealth, listening, patience, and honor into one chain. Restlessness ends when the heart starts hearing Naam as its real capital.",
    whyItMatters: "It gives direction to the person who is tired of roaming, impatient for results, or hungry for recognition without inward steadiness.",
    takeaway: "Patience becomes luminous when it begins listening for Naam.",
    themes: ["patience", "sangat", "truth"],
    emotionalStates: ["restless", "impatient", "seeking"],
    difficulty: "beginner",
    estimatedMinutes: 7,
    lengthBand: "short",
    citation: citation(829, 257, "Guru Arjan Dev Ji", "Raag Gauree", [11238, 11239, 11240, 11241, 11242, 11243, 11244, 11245, 11246]),
    lines: [
      {
        verseId: 11238,
        gurmukhi: "ਪਉੜੀ ॥",
        transliteration: "pauRee ||",
        translation: "Pauree:",
      },
      {
        verseId: 11239,
        gurmukhi: "ਧਧਾ ਧਾਵਤ ਤਉ ਮਿਟੈ ਸੰਤਸੰਗਿ ਹੋਇ ਬਾਸੁ ॥",
        transliteration: "dhadhaa dhaavat tau miTai sa(n)tasa(n)g hoi baas ||",
        translation: "DHADHA: The mind's wanderings cease, when one comes to dwell in the Society of the Saints.",
      },
      {
        verseId: 11240,
        gurmukhi: "ਧੁਰ ਤੇ ਕਿਰਪਾ ਕਰਹੁ ਆਪਿ ਤਉ ਹੋਇ ਮਨਹਿ ਪਰਗਾਸੁ ॥",
        transliteration: "dhur te kirapaa karahu aap tau hoi maneh paragaas ||",
        translation: "If the Lord is Merciful from the very beginning, then one's mind is enlightened.",
      },
      {
        verseId: 11241,
        gurmukhi: "ਧਨੁ ਸਾਚਾ ਤੇਊ ਸਚ ਸਾਹਾ ॥",
        transliteration: "dhan saachaa teuoo sach saahaa ||",
        translation: "Those who have the true wealth are the true bankers.",
      },
      {
        verseId: 11242,
        gurmukhi: "ਹਰਿ ਹਰਿ ਪੂੰਜੀ ਨਾਮ ਬਿਸਾਹਾ ॥",
        transliteration: "har har poo(n)jee naam bisaahaa ||",
        translation: "The Lord, Har, Har, is their wealth, and they trade in His Name.",
      },
      {
        verseId: 11243,
        gurmukhi: "ਧੀਰਜੁ ਜਸੁ ਸੋਭਾ ਤਿਹ ਬਨਿਆ ॥",
        transliteration: "dheeraj jas sobhaa teh baniaa ||",
        translation: "Patience, glory and honor come to those",
      },
      {
        verseId: 11244,
        gurmukhi: "ਹਰਿ ਹਰਿ ਨਾਮੁ ਸ੍ਰਵਨ ਜਿਹ ਸੁਨਿਆ ॥",
        transliteration: "har har naam sravan jeh suniaa ||",
        translation: "who listen to the Name of the Lord, Har, Har.",
      },
      {
        verseId: 11245,
        gurmukhi: "ਗੁਰਮੁਖਿ ਜਿਹ ਘਟਿ ਰਹੇ ਸਮਾਈ ॥",
        transliteration: "gurmukh jeh ghaT rahe samaiee ||",
        translation: "That Gurmukh whose heart remains merged with the Lord,",
      },
      {
        verseId: 11246,
        gurmukhi: "ਨਾਨਕ ਤਿਹ ਜਨ ਮਿਲੀ ਵਡਾਈ ॥੩੫॥",
        transliteration: "naanak teh jan milee vaddaiee ||35||",
        translation: "O Nanak, obtains glorious greatness. ||35||",
      },
    ],
    structure: [
      "Begins by saying that wandering ends in saint company, not in more roaming.",
      "Turns the language of wealth toward Naam and truthful capital.",
      "Ends by joining patience, honor, and glory to the act of listening.",
    ],
    keyVerseIds: [11239, 11241, 11243, 11244],
    relatedGuidanceIds: [
      "guidance-wanderings-cease-in-sangat",
      "guidance-patience-listens-longer",
      "guidance-true-wealth-trades-in-naam",
    ],
    relatedTopicIds: ["topic-seeking", "topic-patience", "topic-exhaustion"],
    relatedCollectionIds: ["collection-tired-heart-to-rest", "collection-truthful-wealth"],
    rotation: rotation("patience", "beginner", 30, 8, "discipline"),
  },
  {
    id: "shabad-ambrosial-speech-pure-conduct",
    title: "Ambrosial Speech, Pure Conduct",
    subtitle: "Raag Gauree · Ang 266",
    summary: "Guru Arjan strips religion down to its living core: Naam, purified conduct, saint company, worthy effort, ambrosial speech, and a heart that becomes the true place.",
    whyItMatters: "It corrects spiritual performance, empty ritual, and language that sounds holy while conduct remains divided.",
    takeaway: "The best religion sounds like praise and looks like clean conduct.",
    themes: ["speech", "discipline", "truth"],
    emotionalStates: ["performing", "harsh", "scattered"],
    difficulty: "beginner",
    estimatedMinutes: 8,
    lengthBand: "short",
    citation: citation(897, 266, "Guru Arjan Dev Ji", "Raag Gauree", [11742, 11743, 11744, 11745, 11746, 11747, 11748, 11749, 11750, 11751]),
    lines: [
      {
        verseId: 11742,
        gurmukhi: "ਸਰਬ ਧਰਮ ਮਹਿ ਸ੍ਰੇਸਟ ਧਰਮੁ ॥",
        transliteration: "sarab dharam meh sresaT dharam ||",
        translation: "Of all religions, the best religion",
      },
      {
        verseId: 11743,
        gurmukhi: "ਹਰਿ ਕੋ ਨਾਮੁ ਜਪਿ ਨਿਰਮਲ ਕਰਮੁ ॥",
        transliteration: "har ko naam jap niramal karam ||",
        translation: "is to chant the Name of the Lord and maintain pure conduct.",
      },
      {
        verseId: 11744,
        gurmukhi: "ਸਗਲ ਕ੍ਰਿਆ ਮਹਿ ਊਤਮ ਕਿਰਿਆ ॥",
        transliteration: "sagal kiraa meh uootam kiriaa ||",
        translation: "Of all religious rituals, the most sublime ritual",
      },
      {
        verseId: 11745,
        gurmukhi: "ਸਾਧਸੰਗਿ ਦੁਰਮਤਿ ਮਲੁ ਹਿਰਿਆ ॥",
        transliteration: "saadhasa(n)g dhuramat mal hiriaa ||",
        translation: "is to erase the filth of the dirty mind in the Company of the Holy.",
      },
      {
        verseId: 11746,
        gurmukhi: "ਸਗਲ ਉਦਮ ਮਹਿ ਉਦਮੁ ਭਲਾ ॥",
        transliteration: "sagal udham meh udham bhalaa ||",
        translation: "Of all efforts, the best effort",
      },
      {
        verseId: 11747,
        gurmukhi: "ਹਰਿ ਕਾ ਨਾਮੁ ਜਪਹੁ ਜੀਅ ਸਦਾ ॥",
        transliteration: "har kaa naam japahu jeea sadhaa ||",
        translation: "is to chant the Name of the Lord in the heart, forever.",
      },
      {
        verseId: 11748,
        gurmukhi: "ਸਗਲ ਬਾਨੀ ਮਹਿ ਅੰਮ੍ਰਿਤ ਬਾਨੀ ॥",
        transliteration: "sagal baanee meh a(n)mirat baanee ||",
        translation: "Of all speech, the most ambrosial speech",
      },
      {
        verseId: 11749,
        gurmukhi: "ਹਰਿ ਕੋ ਜਸੁ ਸੁਨਿ ਰਸਨ ਬਖਾਨੀ ॥",
        transliteration: "har ko jas sun rasan bakhaanee ||",
        translation: "is to hear the Lord's Praise and chant it with the tongue.",
      },
      {
        verseId: 11750,
        gurmukhi: "ਸਗਲ ਥਾਨ ਤੇ ਓਹੁ ਊਤਮ ਥਾਨੁ ॥",
        transliteration: "sagal thaan te oh uootam thaan ||",
        translation: "Of all places, the most sublime place,",
      },
      {
        verseId: 11751,
        gurmukhi: "ਨਾਨਕ ਜਿਹ ਘਟਿ ਵਸੈ ਹਰਿ ਨਾਮੁ ॥੮॥੩॥",
        transliteration: "naanak jeh ghaT vasai har naam ||8||3||",
        translation: "O Nanak, is that heart in which the Name of the Lord abides. ||8||3||",
      },
    ],
    structure: [
      "Ranks the path by what actually purifies rather than by outer identity.",
      "Ties conduct, saint company, effort, and speech back to Naam.",
      "Ends by saying the real holy place is the heart where Naam lives.",
    ],
    keyVerseIds: [11742, 11743, 11745, 11748, 11750],
    relatedGuidanceIds: [
      "guidance-pure-conduct-outweighs-display",
      "guidance-ambrosial-speech-needs-praise",
      "guidance-heart-becomes-the-place",
    ],
    relatedTopicIds: ["topic-softness", "topic-conduct", "topic-honesty"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech", "collection-truthful-wealth"],
    rotation: rotation("speech", "beginner", 30, 8, "discipline"),
  },
  {
    id: "shabad-lord-keeps-the-humble-close",
    title: "The Lord Keeps the Humble Close",
    subtitle: "Raag Raamkalee · Ang 882",
    summary: "This shabad moves from Guru-given life into intimacy: the servant held close, the child cherished, the heart made a place of nearness rather than display.",
    whyItMatters: "It answers shame, insecurity, and spiritual smallness with proximity instead of self-invention.",
    takeaway: "Nearness is received in humility, not built out of status.",
    themes: ["self-worth", "humility", "trust"],
    emotionalStates: ["small", "unwanted", "afraid"],
    difficulty: "growing",
    estimatedMinutes: 8,
    lengthBand: "medium",
    citation: citation(3288, 882, "Guru Raam Daas Ji", "Raag Raamkalee", [37467, 37468, 37469, 37470, 37471, 37472, 37473, 37474, 37475, 37476, 37477]),
    lines: [
      {
        verseId: 37467,
        gurmukhi: "ਰਾਮਕਲੀ ਮਹਲਾ ੪ ॥",
        transliteration: "raamakalee mahalaa chauthhaa ||",
        translation: "Raamkalee, Fourth Mehla:",
      },
      {
        verseId: 37468,
        gurmukhi: "ਸਤਗੁਰੁ ਦਾਤਾ ਵਡਾ ਵਡ ਪੁਰਖੁ ਹੈ ਜਿਤੁ ਮਿਲਿਐ ਹਰਿ ਉਰ ਧਾਰੇ ॥",
        transliteration: "satagur dhaataa vaddaa vadd purakh hai jit miliaai har ur dhaare ||",
        translation: "The True Guru, the Great Giver, is the Great, Primal Being; meeting Him, the Lord is enshrined within the heart.",
      },
      {
        verseId: 37469,
        gurmukhi: "ਜੀਅ ਦਾਨੁ ਗੁਰਿ ਪੂਰੈ ਦੀਆ ਹਰਿ ਅੰਮ੍ਰਿਤ ਨਾਮੁ ਸਮਾਰੇ ॥੧॥",
        transliteration: "jeea dhaan gur poorai dheeaa har a(n)mirat naam samaare ||1||",
        translation: "The Perfect Guru has granted me the life of the soul; I meditate in remembrance on the Ambrosial Name of the Lord. ||1||",
      },
      {
        verseId: 37470,
        gurmukhi: "ਰਾਮ ਗੁਰਿ ਹਰਿ ਹਰਿ ਨਾਮੁ ਕੰਠਿ ਧਾਰੇ ॥",
        transliteration: "raam gur har har naam ka(n)Th dhaare ||",
        translation: "O Lord, the Guru has implanted the Name of the Lord, Har, Har, within my heart.",
      },
      {
        verseId: 37471,
        gurmukhi: "ਗੁਰਮੁਖਿ ਕਥਾ ਸੁਣੀ ਮਨਿ ਭਾਈ ਧਨੁ ਧਨੁ ਵਡ ਭਾਗ ਹਮਾਰੇ ॥੧॥ ਰਹਾਉ ॥",
        transliteration: "gurmukh kathaa sunee man bhaiee dhan dhan vadd bhaag hamaare ||1|| rahaau ||",
        translation: "As Gurmukh, I have heard His sermon, which pleases my mind; blessed, blessed is my great destiny. ||1||Pause||",
      },
      {
        verseId: 37472,
        gurmukhi: "ਕੋਟਿ ਕੋਟਿ ਤੇਤੀਸ ਧਿਆਵਹਿ ਤਾ ਕਾ ਅੰਤੁ ਨ ਪਾਵਹਿ ਪਾਰੇ ॥",
        transliteration: "koT koT tetees dhiaaveh taa kaa a(n)t na paaveh paare ||",
        translation: "Millions, three hundred thirty millions of gods meditate on Him, but they cannot find His end or limitation.",
      },
      {
        verseId: 37473,
        gurmukhi: "ਹਿਰਦੈ ਕਾਮ ਕਾਮਨੀ ਮਾਗਹਿ ਰਿਧਿ ਮਾਗਹਿ ਹਾਥੁ ਪਸਾਰੇ ॥੨॥",
        transliteration: "hiradhai kaam kaamanee maageh ridh maageh haath pasaare ||2||",
        translation: "With sexual urges in their hearts, they beg for beautiful women; stretching out their hands, they beg for riches. ||2||",
      },
      {
        verseId: 37474,
        gurmukhi: "ਹਰਿ ਜਸੁ ਜਪਿ ਜਪੁ ਵਡਾ ਵਡੇਰਾ ਗੁਰਮੁਖਿ ਰਖਉ ਉਰਿ ਧਾਰੇ ॥",
        transliteration: "har jas jap jap vaddaa vadderaa gurmukh rakhau ur dhaare ||",
        translation: "One who chants the Praises of the Lord is the greatest of the great; the Gurmukh keeps the Lord clasped to his heart.",
      },
      {
        verseId: 37475,
        gurmukhi: "ਜੇ ਵਡ ਭਾਗ ਹੋਵਹਿ ਤਾ ਜਪੀਐ ਹਰਿ ਭਉਜਲੁ ਪਾਰਿ ਉਤਾਰੇ ॥੩॥",
        transliteration: "je vadd bhaag hoveh taa japeeaai har bhaujal paar utaare ||3||",
        translation: "If one is blessed with high destiny, he meditates on the Lord, who carries him across the terrifying world-ocean. ||3||",
      },
      {
        verseId: 37476,
        gurmukhi: "ਹਰਿ ਜਨ ਨਿਕਟਿ ਨਿਕਟਿ ਹਰਿ ਜਨ ਹੈ ਹਰਿ ਰਾਖੈ ਕੰਠਿ ਜਨ ਧਾਰੇ ॥",
        transliteration: "har jan nikaT nikaT har jan hai har raakhai ka(n)Th jan dhaare ||",
        translation: "The Lord is close to His humble servant, and His humble servant is close to the Lord; He keeps His humble servant clasped to His Heart.",
      },
      {
        verseId: 37477,
        gurmukhi: "ਨਾਨਕ ਪਿਤਾ ਮਾਤਾ ਹੈ ਹਰਿ ਪ੍ਰਭੁ ਹਮ ਬਾਰਿਕ ਹਰਿ ਪ੍ਰਤਿਪਾਰੇ ॥੪॥੬॥੧੮॥",
        transliteration: "naanak pitaa maataa hai har prabh ham baarik har pratipaare ||4||6||18||",
        translation: "O Nanak, the Lord God is our father and mother. I am His child; the Lord cherishes me. ||4||6||18||",
      },
    ],
    structure: [
      "Begins with Guru-given life and Naam placed in the heart.",
      "Contrasts begging for desire with keeping praise close.",
      "Ends by naming the servant held close and the child cherished by the Divine.",
    ],
    keyVerseIds: [37468, 37474, 37476, 37477],
    relatedGuidanceIds: [
      "guidance-held-close-not-abandoned",
      "guidance-cherished-like-a-child",
      "guidance-nearness-is-bigger-than-status",
    ],
    relatedTopicIds: ["topic-self-worth", "topic-shame", "topic-fear"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-control-to-release"],
    rotation: rotation("self-worth", "growing", 30, 8, "comfort"),
  },
  {
    id: "shabad-forgiveness-opens-lasting-peace",
    title: "Forgiveness Opens Lasting Peace",
    subtitle: "Raag Sorath · Ang 628",
    summary: "The movement here is short and decisive: forgiveness received, peace found, Bani sung, Naam remembered, destiny softened by grace.",
    whyItMatters: "It speaks to shame, bitterness, and the belief that peace must be self-authored before grace can begin working.",
    takeaway: "Forgiveness is not the end of the path; it is what makes peace inhabitable.",
    themes: ["forgiveness", "peace", "grace"],
    emotionalStates: ["ashamed", "heavy", "bitter"],
    difficulty: "beginner",
    estimatedMinutes: 7,
    lengthBand: "medium",
    citation: citation(2380, 628, "Guru Arjan Dev Ji", "Raag Sorath", [27257, 27258, 27259, 27260, 27261, 27262, 27263, 27264, 27265, 27266, 27267]),
    lines: [
      {
        verseId: 27257,
        gurmukhi: "ਸੋਰਠਿ ਮਹਲਾ ੫ ॥",
        transliteration: "soraTh mahalaa panjavaa ||",
        translation: "Sorat'h, Fifth Mehla:",
      },
      {
        verseId: 27258,
        gurmukhi: "ਗੁਰਿ ਪੂਰੈ ਪੂਰੀ ਕੀਨੀ ॥",
        transliteration: "gur poorai pooree keenee ||",
        translation: "The Perfect Guru has done it perfectly.",
      },
      {
        verseId: 27259,
        gurmukhi: "ਬਖਸ ਅਪੁਨੀ ਕਰਿ ਦੀਨੀ ॥",
        transliteration: "bakhas apunee kar dheenee ||",
        translation: "He blessed me with forgiveness.",
      },
      {
        verseId: 27260,
        gurmukhi: "ਨਿਤ ਅਨੰਦ ਸੁਖ ਪਾਇਆ ॥",
        transliteration: "nit ana(n)dh sukh paiaa ||",
        translation: "I have found lasting peace and bliss.",
      },
      {
        verseId: 27261,
        gurmukhi: "ਥਾਵ ਸਗਲੇ ਸੁਖੀ ਵਸਾਇਆ ॥੧॥",
        transliteration: "thaav sagale sukhee vasaiaa ||1||",
        translation: "Everywhere, the people dwell in peace. ||1||",
      },
      {
        verseId: 27262,
        gurmukhi: "ਹਰਿ ਕੀ ਭਗਤਿ ਫਲ ਦਾਤੀ ॥",
        transliteration: "har kee bhagat fal dhaatee ||",
        translation: "Devotional worship to the Lord is what gives rewards.",
      },
      {
        verseId: 27263,
        gurmukhi: "ਗੁਰਿ ਪੂਰੈ ਕਿਰਪਾ ਕਰਿ ਦੀਨੀ ਵਿਰਲੈ ਕਿਨ ਹੀ ਜਾਤੀ ॥ ਰਹਾਉ ॥",
        transliteration: "gur poorai kirapaa kar dheenee viralai kin hee jaatee || rahaau ||",
        translation: "The Perfect Guru, by His Grace, gave it to me; how rare are those who know this. ||Pause||",
      },
      {
        verseId: 27264,
        gurmukhi: "ਗੁਰਬਾਣੀ ਗਾਵਹ ਭਾਈ ॥",
        transliteration: "gurbaanee gaaveh bhaiee ||",
        translation: "Sing the Word of the Guru's Bani, O Siblings of Destiny.",
      },
      {
        verseId: 27265,
        gurmukhi: "ਓਹ ਸਫਲ ਸਦਾ ਸੁਖਦਾਈ ॥",
        transliteration: "oh safal sadhaa sukhadhaiee ||",
        translation: "That is always rewarding and peace-giving.",
      },
      {
        verseId: 27266,
        gurmukhi: "ਨਾਨਕ ਨਾਮੁ ਧਿਆਇਆ ॥",
        transliteration: "naanak naam dhiaaiaa ||",
        translation: "Nanak has meditated on the Naam, the Name of the Lord.",
      },
      {
        verseId: 27267,
        gurmukhi: "ਪੂਰਬਿ ਲਿਖਿਆ ਪਾਇਆ ॥੨॥੧੭॥੮੧॥",
        transliteration: "poorab likhiaa paiaa ||2||17||81||",
        translation: "He has realized his pre-ordained destiny. ||2||17||81||",
      },
    ],
    structure: [
      "Moves immediately from forgiveness into peace and bliss.",
      "Keeps the center of gravity in grace rather than self-improvement.",
      "Ends by joining Guru Bani, Naam, and a life redirected into reward-bearing peace.",
    ],
    keyVerseIds: [27259, 27260, 27263, 27264, 27266],
    relatedGuidanceIds: [
      "guidance-forgiveness-opens-the-room",
      "guidance-sing-bani-into-peace",
      "guidance-grace-settles-what-you-cannot",
    ],
    relatedTopicIds: ["topic-shame", "topic-forgiveness", "topic-fear"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-mercy-and-fearlessness"],
    rotation: rotation("forgiveness", "beginner", 30, 8, "comfort"),
  },
]

export const PHASE_THREE_DAILY_GUIDANCE_ENTRIES: DailyGuidance[] = [
  {
    id: "guidance-wanderings-cease-in-sangat",
    title: "Wandering slows where true company begins.",
    summary: "The pauree does not flatter the restless mind. It says the wandering starts easing when you actually dwell in saint company.",
    takeaway: "Do not confuse more movement with more progress.",
    lifeApplication: "Choose one faithful company today instead of ten new inputs.",
    source: ref(
      "shabad-patience-ripens-into-honor",
      [11239, 11240],
      "Wandering eases where Sangat and mercy begin enlightening the mind.",
      "Restlessness often needs better placement before it needs more explanation."
    ),
    relatedTopicIds: ["topic-seeking", "topic-exhaustion", "topic-sangat"],
    relatedShabadIds: ["shabad-patience-ripens-into-honor", "shabad-search-ends-in-saint-company"],
    relatedCollectionIds: ["collection-tired-heart-to-rest", "collection-restlessness-to-stillness"],
    rotation: rotation("seeking", "beginner", 45, 8, "comfort"),
  },
  {
    id: "guidance-patience-listens-longer",
    title: "Patience may start as a listening discipline.",
    summary: "Guru ties patience and honor to hearing Naam. The point is not passive delay, but a heart that has stopped interrupting the medicine.",
    takeaway: "Wait by listening, not by simmering.",
    lifeApplication: "Before reacting to delay, make space to hear one line all the way through.",
    source: ref(
      "shabad-patience-ripens-into-honor",
      [11243, 11244],
      "Patience and honor grow where the ear starts taking in Naam.",
      "Listening can become the first form of obedience."
    ),
    relatedTopicIds: ["topic-patience", "topic-exhaustion", "topic-discipline"],
    relatedShabadIds: ["shabad-patience-ripens-into-honor", "shabad-search-ends-in-saint-company"],
    relatedCollectionIds: ["collection-tired-heart-to-rest"],
    rotation: rotation("patience", "beginner", 45, 8, "discipline"),
  },
  {
    id: "guidance-true-wealth-trades-in-naam",
    title: "Trade in what keeps the heart solvent.",
    summary: "The shabad calls Naam the real capital. What looks valuable may still leave the inner life bankrupt.",
    takeaway: "Carry wealth that can survive departure.",
    lifeApplication: "Ask what you are investing in today that will still matter when display disappears.",
    source: ref(
      "shabad-patience-ripens-into-honor",
      [11241, 11242],
      "True wealth is not abstract virtue but Naam treated as actual capital.",
      "Let the day be measured by what deepens the heart, not by what decorates it."
    ),
    relatedTopicIds: ["topic-honesty", "topic-greed", "topic-purpose"],
    relatedShabadIds: ["shabad-patience-ripens-into-honor", "shabad-buy-what-goes-with-you"],
    relatedCollectionIds: ["collection-truthful-wealth", "collection-conduct-and-clean-speech"],
    rotation: rotation("truth", "beginner", 45, 8, "discipline"),
  },
  {
    id: "guidance-pure-conduct-outweighs-display",
    title: "Pure conduct outranks spiritual display.",
    summary: "Guru does not leave the religious life undefined. The better religion is the one that purifies action, not the one that performs itself most loudly.",
    takeaway: "What you do with the heart matters more than what you advertise about it.",
    lifeApplication: "Choose the cleaner action over the more impressive one.",
    source: ref(
      "shabad-ambrosial-speech-pure-conduct",
      [11742, 11743, 11744, 11745],
      "The best path is tied to Naam, conduct, and the removal of inner filth through company.",
      "Do not let ritual substitute for transformation."
    ),
    relatedTopicIds: ["topic-conduct", "topic-honesty", "topic-seeking"],
    relatedShabadIds: ["shabad-ambrosial-speech-pure-conduct", "shabad-work-give-know-the-path"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech"],
    rotation: rotation("conduct", "beginner", 45, 8, "discipline"),
  },
  {
    id: "guidance-ambrosial-speech-needs-praise",
    title: "Better speech starts by changing what the tongue loves.",
    summary: "Ambrosial speech here is not polished phrasing. It is speech trained by hearing and carrying praise.",
    takeaway: "A soft tongue still needs a holy subject.",
    lifeApplication: "Let one conversation today carry more reverence than reaction.",
    source: ref(
      "shabad-ambrosial-speech-pure-conduct",
      [11748, 11749],
      "Speech becomes ambrosial when it is fed by praise rather than appetite or contempt.",
      "Train the tongue by training the heart's attention."
    ),
    relatedTopicIds: ["topic-softness", "topic-speech", "topic-conduct"],
    relatedShabadIds: ["shabad-ambrosial-speech-pure-conduct", "shabad-speak-what-brings-honor"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech", "collection-speech-and-self-restraint"],
    rotation: rotation("speech", "beginner", 45, 8, "challenge"),
  },
  {
    id: "guidance-heart-becomes-the-place",
    title: "The best place may be an inhabited heart.",
    summary: "Guru finishes the shabad by relocating holiness. The truest place is the heart where Naam actually lives.",
    takeaway: "Make the interior fit for what you say you seek.",
    lifeApplication: "Before chasing atmosphere, ask what you are doing to make the heart more inhabitable.",
    source: ref(
      "shabad-ambrosial-speech-pure-conduct",
      [11750, 11751],
      "The holiest place is not merely external; it is the heart carrying Naam.",
      "Inner architecture matters more than scene-setting."
    ),
    relatedTopicIds: ["topic-conduct", "topic-purpose", "topic-softness"],
    relatedShabadIds: ["shabad-ambrosial-speech-pure-conduct", "shabad-remembrance-brings-peace"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech"],
    rotation: rotation("conduct", "growing", 45, 7, "reflection"),
  },
  {
    id: "guidance-held-close-not-abandoned",
    title: "Nearness is still available, even when you feel small.",
    summary: "The shabad names the humble servant as held close. Smallness is not the same thing as abandonment.",
    takeaway: "Do not read your current weakness as distance from care.",
    lifeApplication: "When insecurity rises, answer it with nearness instead of self-attack.",
    source: ref(
      "shabad-lord-keeps-the-humble-close",
      [37474, 37476],
      "Praise and nearness belong together in the life of the humble servant.",
      "You do not need status to be held close."
    ),
    relatedTopicIds: ["topic-self-worth", "topic-shame", "topic-fear"],
    relatedShabadIds: ["shabad-lord-keeps-the-humble-close", "shabad-child-of-grace"],
    relatedCollectionIds: ["collection-shame-to-welcome"],
    rotation: rotation("self-worth", "beginner", 45, 8, "comfort"),
  },
  {
    id: "guidance-cherished-like-a-child",
    title: "Let yourself be addressed as someone worth cherishing.",
    summary: "Guru does not merely tolerate the child here. Guru cherishes the child. That changes how need itself is carried.",
    takeaway: "Need can be brought honestly when care is trusted.",
    lifeApplication: "Bring one raw need into prayer today without dressing it up as competence.",
    source: ref(
      "shabad-lord-keeps-the-humble-close",
      [37476, 37477],
      "The servant held close is also the child cherished by the Divine.",
      "Belonging softens the panic that says you must hold yourself up alone."
    ),
    relatedTopicIds: ["topic-self-worth", "topic-loneliness", "topic-shame"],
    relatedShabadIds: ["shabad-lord-keeps-the-humble-close", "shabad-child-of-grace"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-sangat-and-belonging"],
    rotation: rotation("self-worth", "beginner", 45, 8, "comfort"),
  },
  {
    id: "guidance-nearness-is-bigger-than-status",
    title: "Status cannot do what nearness does.",
    summary: "The shabad contrasts desire-driven reaching with being held close. One is hungry display. The other is actual relation.",
    takeaway: "Aim for closeness, not rank.",
    lifeApplication: "Trade one status reflex today for one act of quiet remembrance.",
    source: ref(
      "shabad-lord-keeps-the-humble-close",
      [37473, 37476],
      "The life that keeps reaching for riches is not the same life that learns nearness.",
      "The deepest correction may be relational, not performative."
    ),
    relatedTopicIds: ["topic-control", "topic-self-worth", "topic-ego"],
    relatedShabadIds: ["shabad-lord-keeps-the-humble-close", "shabad-conquer-the-mind"],
    relatedCollectionIds: ["collection-control-to-release", "collection-shame-to-welcome"],
    rotation: rotation("self-worth", "growing", 45, 7, "reflection"),
  },
  {
    id: "guidance-forgiveness-opens-the-room",
    title: "Forgiveness can change the whole room you live inside.",
    summary: "The shabad does not treat forgiveness as a small emotional adjustment. It opens directly into peace and inhabitable space.",
    takeaway: "Forgiveness is one way grace rearranges the atmosphere.",
    lifeApplication: "Notice what bitterness is making unlivable, then bring that exact knot into Bani.",
    source: ref(
      "shabad-forgiveness-opens-lasting-peace",
      [27259, 27260, 27261],
      "Forgiveness moves swiftly into peace that fills the room.",
      "Release does not only change mood; it changes the space you move through."
    ),
    relatedTopicIds: ["topic-shame", "topic-forgiveness", "topic-softness"],
    relatedShabadIds: ["shabad-forgiveness-opens-lasting-peace", "shabad-forgiveness-becomes-fearless"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-mercy-and-fearlessness"],
    rotation: rotation("forgiveness", "beginner", 45, 8, "comfort"),
  },
  {
    id: "guidance-sing-bani-into-peace",
    title: "Do not only analyze peace. Sing your way into it.",
    summary: "The shabad answers peace not with abstraction but with Bani sung, grace received, and Naam remembered.",
    takeaway: "Sometimes peace enters through voiced devotion before it enters through insight.",
    lifeApplication: "Use your actual voice with one line today instead of keeping everything in mental commentary.",
    source: ref(
      "shabad-forgiveness-opens-lasting-peace",
      [27263, 27264, 27265],
      "Grace and Guru Bani create a peace that is both rewarding and sustaining.",
      "Peace can be practiced aloud."
    ),
    relatedTopicIds: ["topic-fear", "topic-exhaustion", "topic-shame"],
    relatedShabadIds: ["shabad-forgiveness-opens-lasting-peace", "shabad-remembrance-brings-peace"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-tired-heart-to-rest"],
    rotation: rotation("forgiveness", "beginner", 45, 7, "comfort"),
  },
  {
    id: "guidance-grace-settles-what-you-cannot",
    title: "Grace may settle what effort keeps failing to move.",
    summary: "The line admits that what peace finally comes from is grace recognized, not force extended indefinitely.",
    takeaway: "Work faithfully, but do not worship strain.",
    lifeApplication: "Name one place where effort has become hardening, then ask for grace there without embarrassment.",
    source: ref(
      "shabad-forgiveness-opens-lasting-peace",
      [27263, 27266, 27267],
      "Grace, Naam, and destiny are bound together more tightly than control admits.",
      "You can stop pretending that everything must be forced open."
    ),
    relatedTopicIds: ["topic-control", "topic-shame", "topic-fear"],
    relatedShabadIds: ["shabad-forgiveness-opens-lasting-peace", "shabad-what-pleases-you-comes-to-pass"],
    relatedCollectionIds: ["collection-control-to-release", "collection-shame-to-welcome"],
    rotation: rotation("grace", "growing", 45, 7, "reflection"),
  },
]

export const PHASE_THREE_TOPIC_GUIDES: LegacyTopicGuide[] = [
  {
    id: "topic-control",
    title: "When you are gripping too hard",
    shortTitle: "Control",
    category: "most-needed",
    issueStatement: "You keep tightening around outcomes, people, or timing because letting go feels like negligence.",
    centralInsight: "Gurbani loosens control by relocating authorship. Responsibility remains, but total authorship is taken out of your hands and returned to Hukam, mercy, and nearness.",
    practicalReflection: "Control often disguises itself as maturity. The real question is whether remembrance survives while you are acting.",
    actionPrompt: "Name the result you are trying to secure today. Offer one faithful action, then release the fantasy of total control.",
    searchTerms: ["control", "controlling", "micromanaging", "can't let go", "outcomes", "fix everything"],
    excerpts: [
      {
        source: ref(
          "shabad-what-pleases-you-comes-to-pass",
          [499, 512],
          "What pleases the Divine comes to pass; everything that happens is already within that doing.",
          "Act, but stop imagining that authorship belongs to the anxious self."
        ),
        explanation: "The shabad does not erase action; it reorders the doer.",
      },
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [15, 16],
          "Nothing stands outside Hukam, and understanding that loosens ego.",
          "Control weakens when the mind stops demanding a reality beyond Hukam."
        ),
        explanation: "The correction is metaphysical before it becomes emotional.",
      },
      {
        source: ref(
          "shabad-lord-keeps-the-humble-close",
          [37476, 37477],
          "Nearness and care are already present for the one who stops living by rank and force.",
          "Release grows where belonging becomes more convincing than pressure."
        ),
        explanation: "Control softens when nearness becomes credible.",
      },
    ],
    relatedShabadIds: [
      "shabad-what-pleases-you-comes-to-pass",
      "shabad-hukam-inside-everything",
      "shabad-lord-keeps-the-humble-close",
    ],
    relatedTopicIds: ["topic-anxiety", "topic-hukam", "topic-fear"],
    relatedCollectionIds: ["collection-control-to-release", "collection-fear-to-trust"],
    rotation: rotation("control", "growing", 21, 8, "reflection"),
  },
  {
    id: "topic-shame",
    title: "When shame keeps talking",
    shortTitle: "Shame",
    category: "most-needed",
    issueStatement: "You have turned one failure, one wound, or one pattern into the whole meaning of yourself.",
    centralInsight: "Guru answers shame with forgiveness, nearness, and belonging. The self is corrected, but it is not abandoned.",
    practicalReflection: "Shame says withdraw until you deserve return. Gurbani keeps opening the door before your self-story is complete.",
    actionPrompt: "When shame starts narrating finality, answer it with one line of Bani and one act of return.",
    searchTerms: ["shame", "guilty", "unworthy", "dirty", "self-loathing", "regret"],
    excerpts: [
      {
        source: ref(
          "shabad-forgiveness-opens-lasting-peace",
          [27259, 27260],
          "Forgiveness is followed immediately by lasting peace, not by probation.",
          "Grace answers shame faster than shame expects."
        ),
        explanation: "The shabad refuses to let guilt become an identity system.",
      },
      {
        source: ref(
          "shabad-lord-keeps-the-humble-close",
          [37476, 37477],
          "The humble servant is held close, and the child is cherished.",
          "Smallness does not disqualify you from nearness."
        ),
        explanation: "This is not mere comfort language. It is theological placement.",
      },
      {
        source: ref(
          "shabad-forgiveness-becomes-fearless",
          [9600, 9603, 9605],
          "Forgiveness and real discipline belong together; the path is not emptied of moral seriousness.",
          "Return does not remove form. It removes despair."
        ),
        explanation: "Guru joins mercy with conduct rather than choosing one against the other.",
      },
    ],
    relatedShabadIds: [
      "shabad-forgiveness-opens-lasting-peace",
      "shabad-lord-keeps-the-humble-close",
      "shabad-forgiveness-becomes-fearless",
    ],
    relatedTopicIds: ["topic-self-worth", "topic-forgiveness", "topic-mercy"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-mercy-and-fearlessness"],
    rotation: rotation("shame", "growing", 21, 8, "comfort"),
  },
  {
    id: "topic-fear",
    title: "When fear keeps writing the script",
    shortTitle: "Fear",
    category: "most-needed",
    issueStatement: "Fear keeps deciding what will happen, who will leave, and what disaster you must defend against.",
    centralInsight: "Gurbani does not build fearlessness out of bravado. Fear loosens through reverence, Hukam, forgiveness, and the nearness of the One already holding the moment.",
    practicalReflection: "Fear wants guarantees before obedience. Gurbani keeps turning the mind toward the One who remains present before the guarantees arrive.",
    actionPrompt: "When fear rises, read one line aloud before you plan your defense.",
    searchTerms: ["fear", "afraid", "scared", "dread", "panic", "insecure"],
    excerpts: [
      {
        source: ref(
          "shabad-hukam-inside-everything",
          [15, 16],
          "Everything stands within Hukam, and real understanding loosens ego-driven alarm.",
          "Fear cannot rule as absolutely when reality is wider than the frightened self."
        ),
        explanation: "The correction begins by changing the frame, not merely the feeling.",
      },
      {
        source: ref(
          "shabad-forgiveness-becomes-fearless",
          [9611, 9612, 9613],
          "Service, reverence, and disciplined devotion are the soil in which fearlessness grows.",
          "Fearlessness is cultivated, not performed."
        ),
        explanation: "Guru gives a path, not a slogan.",
      },
      {
        source: ref(
          "shabad-lord-keeps-the-humble-close",
          [37476, 37477],
          "Nearness and cherished belonging counter the loneliness that fear feeds on.",
          "The answer to fear is often relational before it is explanatory."
        ),
        explanation: "Heldness changes the nervous system of the path.",
      },
    ],
    relatedShabadIds: [
      "shabad-hukam-inside-everything",
      "shabad-forgiveness-becomes-fearless",
      "shabad-lord-keeps-the-humble-close",
    ],
    relatedTopicIds: ["topic-anxiety", "topic-shame", "topic-mercy"],
    relatedCollectionIds: ["collection-control-to-release", "collection-mercy-and-fearlessness"],
    rotation: rotation("fear", "growing", 21, 8, "comfort"),
  },
  {
    id: "topic-honesty",
    title: "When you need to live cleanly",
    shortTitle: "Honesty",
    category: "practice",
    issueStatement: "You know what clean living requires, but compromise keeps disguising itself as necessity or sophistication.",
    centralInsight: "Gurbani treats truthful living as trade, conduct, and alignment. False gain does not only stain the action; it fractures the person carrying it.",
    practicalReflection: "Dishonesty is not only lying. It is any deal that leaves the mind more divided than before.",
    actionPrompt: "Refuse one convenient compromise today, even if nobody else would have noticed it.",
    searchTerms: ["honesty", "honest living", "integrity", "crooked", "compromise", "truthfulness"],
    excerpts: [
      {
        source: ref(
          "shabad-buy-what-goes-with-you",
          [934, 939, 946],
          "Buy what goes with you; false deals deform the whole person, while truthful gain becomes fearlessness.",
          "Integrity is an investment, not an accessory."
        ),
        explanation: "Guru turns ethics into a question of what actually lasts.",
      },
      {
        source: ref(
          "shabad-ambrosial-speech-pure-conduct",
          [11742, 11743, 11744, 11745],
          "The best religion is tied to pure conduct and the removal of inner dirt.",
          "Right conduct is not separate from devotion."
        ),
        explanation: "This keeps conduct from becoming secularized self-improvement.",
      },
      {
        source: ref(
          "shabad-patience-ripens-into-honor",
          [11241, 11242],
          "The true banker is the one trading in Naam as wealth.",
          "Honesty begins with choosing the right economy."
        ),
        explanation: "What you count as wealth will shape what you permit yourself to do.",
      },
    ],
    relatedShabadIds: [
      "shabad-buy-what-goes-with-you",
      "shabad-ambrosial-speech-pure-conduct",
      "shabad-patience-ripens-into-honor",
    ],
    relatedTopicIds: ["topic-conduct", "topic-greed", "topic-purpose"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech", "collection-truthful-wealth"],
    rotation: rotation("honesty", "growing", 21, 8, "discipline"),
  },
  {
    id: "topic-seeking",
    title: "When searching becomes a habit",
    shortTitle: "Seeking",
    category: "inner-work",
    issueStatement: "You keep moving between practices, explanations, and moods, but still feel unlanded.",
    centralInsight: "Search has a place, but Gurbani warns that wandering can become an identity. Search must eventually hand itself over to company, instruction, and lived return.",
    practicalReflection: "The point is not to collect more spiritual scenery. The point is to let the mind settle where Guru actually teaches.",
    actionPrompt: "Stop adding new inputs for one day. Stay with one guide, one shabad, and one faithful act of company.",
    searchTerms: ["searching", "wandering", "seeking", "can't settle", "spiritually lost", "looking everywhere"],
    excerpts: [
      {
        source: ref(
          "shabad-search-ends-in-saint-company",
          [3890, 3891, 3898],
          "Search and travel can multiply, but peace only lands where better company cools the body.",
          "Wandering is not automatically depth."
        ),
        explanation: "The shabad distinguishes motion from arrival.",
      },
      {
        source: ref(
          "shabad-extinguish-the-fire-of-doubt",
          [918, 920, 924],
          "Doubt is not extinguished by roaming but by Guru's instruction and Sangat.",
          "Search must stop feeding the fire it says it wants to solve."
        ),
        explanation: "Seeking becomes medicine only when it submits.",
      },
      {
        source: ref(
          "shabad-patience-ripens-into-honor",
          [11239, 11240],
          "Wandering ends in saint company, and the mind brightens through mercy there.",
          "Often the next step is placement, not novelty."
        ),
        explanation: "The path settles by dwelling somewhere true.",
      },
    ],
    relatedShabadIds: [
      "shabad-search-ends-in-saint-company",
      "shabad-extinguish-the-fire-of-doubt",
      "shabad-patience-ripens-into-honor",
    ],
    relatedTopicIds: ["topic-doubt", "topic-restlessness", "topic-sangat"],
    relatedCollectionIds: ["collection-tired-heart-to-rest", "collection-doubt-to-clarity"],
    rotation: rotation("seeking", "growing", 21, 8, "reflection"),
  },
  {
    id: "topic-self-worth",
    title: "When you feel small or unwanted",
    shortTitle: "Self Worth",
    category: "most-needed",
    issueStatement: "You keep reading your worth through approval, performance, or whatever most recently went wrong.",
    centralInsight: "Gurbani gives dignity by relation, not vanity: the servant held close, the child cherished, the heart inhabited by Naam.",
    practicalReflection: "Self-worth collapses when it is tied to comparison. Guru roots it instead in nearness, grace, and truthful belonging.",
    actionPrompt: "When you feel reduced today, repeat one line that names you in relation to the Divine rather than to the crowd.",
    searchTerms: ["worthless", "not enough", "unwanted", "unseen", "rejected", "low self worth"],
    excerpts: [
      {
        source: ref(
          "shabad-lord-keeps-the-humble-close",
          [37476, 37477],
          "The humble servant is held close, and the child is cherished.",
          "Dignity here comes from nearness, not performance."
        ),
        explanation: "The shabad refuses the market logic of worth.",
      },
      {
        source: ref(
          "shabad-child-of-grace",
          [3761, 3762, 3763],
          "The Guru is protector, mother, and father to the helpless child.",
          "Need does not cancel worth; it reveals where care is meant to be received."
        ),
        explanation: "This turns dependence into a doorway rather than a defect.",
      },
      {
        source: ref(
          "shabad-honor-women",
          [21287, 21289],
          "What Guru honors cannot be spoken of as disposable or lesser.",
          "Gurbani revises contempt at the level of value itself."
        ),
        explanation: "Honor in Gurbani is not sentimental; it is theological.",
      },
    ],
    relatedShabadIds: [
      "shabad-lord-keeps-the-humble-close",
      "shabad-child-of-grace",
      "shabad-honor-women",
    ],
    relatedTopicIds: ["topic-loneliness", "topic-shame", "topic-comparison"],
    relatedCollectionIds: ["collection-shame-to-welcome", "collection-sangat-and-belonging"],
    rotation: rotation("self-worth", "growing", 21, 8, "comfort"),
  },
  {
    id: "topic-softness",
    title: "When harshness has become your default",
    shortTitle: "Softness",
    category: "practice",
    issueStatement: "Your inner and outer tone has become sharper than you want to admit.",
    centralInsight: "Gurbani does not ask for politeness theatre. It asks for speech softened by praise, humility, and regard for the one in front of you.",
    practicalReflection: "Softness is not weakness. It is disciplined refusal to let the tongue become an outlet for ego or contempt.",
    actionPrompt: "Lower the sharpness in one conversation today without lowering the truth.",
    searchTerms: ["softness", "gentle", "harsh", "tenderness", "cutting words", "hard-hearted"],
    excerpts: [
      {
        source: ref(
          "shabad-ambrosial-speech-pure-conduct",
          [11748, 11749],
          "The better speech is the speech carrying praise.",
          "What the tongue feeds on decides what tone it produces."
        ),
        explanation: "Guru redirects the source of speech before correcting the style of speech.",
      },
      {
        source: ref(
          "shabad-speak-what-brings-honor",
          [642, 643],
          "Speech that brings honor is accepted; harsh words return grief.",
          "Reaction is not the same thing as truthfulness."
        ),
        explanation: "Softness is named as moral seriousness, not softness for its own sake.",
      },
      {
        source: ref(
          "shabad-sweet-speech-humble-walk",
          [1288, 1290],
          "Sweet speech becomes believable when it grows from humility and saint company.",
          "Tone is strongest when posture has already bowed."
        ),
        explanation: "This keeps softness from becoming performance or strategy.",
      },
    ],
    relatedShabadIds: [
      "shabad-ambrosial-speech-pure-conduct",
      "shabad-speak-what-brings-honor",
      "shabad-sweet-speech-humble-walk",
    ],
    relatedTopicIds: ["topic-speech", "topic-anger", "topic-forgiveness"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech", "collection-speech-and-self-restraint"],
    rotation: rotation("softness", "growing", 21, 7, "challenge"),
  },
  {
    id: "topic-exhaustion",
    title: "When the soul feels worn thin",
    shortTitle: "Exhaustion",
    category: "most-needed",
    issueStatement: "You are still functioning, but the inner thread feels overused, brittle, and close to snapping.",
    centralInsight: "Gurbani treats exhaustion as more than low energy. It can be the fruit of wandering, over-carrying, and trying to finish the path without Sangat, patience, or Naam.",
    practicalReflection: "A tired soul often keeps adding movement. Guru keeps turning it back toward company, hearing, remembrance, and the right kind of rest.",
    actionPrompt: "Shrink the day to one faithful practice instead of ten frantic ones.",
    searchTerms: ["exhausted", "burnt out", "tired", "drained", "weary", "worn out"],
    excerpts: [
      {
        source: ref(
          "shabad-search-ends-in-saint-company",
          [3890, 3898, 3900],
          "Search can exhaust the body until saint company and mercy cool it back down.",
          "Exhaustion is sometimes the cost of trying to settle the soul alone."
        ),
        explanation: "The shabad names a tired form of searching that still does not land.",
      },
      {
        source: ref(
          "shabad-patience-ripens-into-honor",
          [11239, 11243, 11244],
          "Wandering ceases and patience becomes honorable where Naam is heard.",
          "The exhausted life may need less self-pressure and more listening."
        ),
        explanation: "Guru pairs rest with hearing rather than with collapse.",
      },
      {
        source: ref(
          "shabad-remembrance-brings-peace",
          [11502, 11503],
          "Repeated remembrance is given as medicine for worry and bodily strain.",
          "Exhaustion sometimes needs repetition more than innovation."
        ),
        explanation: "The line is practical: remembrance changes what the body is carrying.",
      },
    ],
    relatedShabadIds: [
      "shabad-search-ends-in-saint-company",
      "shabad-patience-ripens-into-honor",
      "shabad-remembrance-brings-peace",
    ],
    relatedTopicIds: ["topic-seeking", "topic-patience", "topic-restlessness"],
    relatedCollectionIds: ["collection-tired-heart-to-rest", "collection-restlessness-to-stillness"],
    rotation: rotation("exhaustion", "growing", 21, 8, "comfort"),
  },
  {
    id: "topic-conduct",
    title: "When life and practice do not match",
    shortTitle: "Conduct",
    category: "practice",
    issueStatement: "Your declared values and your repeated habits no longer feel like the same life.",
    centralInsight: "Pure conduct in Gurbani is not image management. It is what happens when Naam, Sangat, labor, and speech start agreeing with one another.",
    practicalReflection: "Conduct is where admiration either becomes form or becomes obedience.",
    actionPrompt: "Choose one practice today that closes the gap between what you say matters and what you actually do.",
    searchTerms: ["conduct", "lifestyle", "practice", "hypocrisy", "integrity", "pure conduct"],
    excerpts: [
      {
        source: ref(
          "shabad-ambrosial-speech-pure-conduct",
          [11742, 11743, 11744, 11745],
          "The better religion is recognized by purified conduct and the removal of inner filth.",
          "Practice becomes real when it starts changing behavior."
        ),
        explanation: "Guru defines the standard instead of leaving it to self-branding.",
      },
      {
        source: ref(
          "shabad-selfless-service",
          [12943, 12944, 12947],
          "Do not advertise yourself; keep Naam in the heart and serve without reward-hunger.",
          "Conduct is often revealed by what you still want to be seen for."
        ),
        explanation: "Seva becomes one test of whether values are embodied or staged.",
      },
      {
        source: ref(
          "shabad-buy-what-goes-with-you",
          [934, 937, 939],
          "Choose what lasts, carry praise, and refuse false deals that corrode the self.",
          "Conduct is also economic: what are you really buying with your life?"
        ),
        explanation: "This keeps conduct tied to consequence, not aesthetics.",
      },
    ],
    relatedShabadIds: [
      "shabad-ambrosial-speech-pure-conduct",
      "shabad-selfless-service",
      "shabad-buy-what-goes-with-you",
    ],
    relatedTopicIds: ["topic-honesty", "topic-discipline", "topic-softness"],
    relatedCollectionIds: ["collection-conduct-and-clean-speech", "collection-truthful-wealth"],
    rotation: rotation("conduct", "growing", 21, 8, "discipline"),
  },
]

export const PHASE_THREE_COLLECTIONS: Collection[] = [
  {
    id: "collection-control-to-release",
    title: "From Control to Release",
    subtitle: "A steadier arc for the over-gripping mind",
    description: "Start where fear tightens the hand, then move through Hukam, nearness, and grace until action becomes faithful without trying to become absolute.",
    durationLabel: "4-step arc",
    themes: ["control", "hukam", "trust"],
    heroSource: ref(
      "shabad-what-pleases-you-comes-to-pass",
      [499, 512],
      "What pleases the Divine comes to pass; everything that happens is already within that doing.",
      "Release becomes possible when authorship is remembered correctly."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-what-pleases-you" },
      { kind: "topic-guide", id: "topic-control" },
      { kind: "daily-guidance", id: "guidance-grace-settles-what-you-cannot" },
      { kind: "shabad-deep-dive", id: "shabad-hukam-inside-everything" },
      { kind: "shabad-deep-dive", id: "shabad-lord-keeps-the-humble-close" },
    ],
    relatedTopicIds: ["topic-control", "topic-hukam", "topic-fear"],
    relatedShabadIds: [
      "shabad-what-pleases-you-comes-to-pass",
      "shabad-hukam-inside-everything",
      "shabad-lord-keeps-the-humble-close",
    ],
  },
  {
    id: "collection-shame-to-welcome",
    title: "From Shame to Welcome",
    subtitle: "A return path for the self that wants to hide",
    description: "This journey is for the voice that keeps saying you are disqualified. It answers that voice with forgiveness, nearness, and the language of being cherished.",
    durationLabel: "5-step arc",
    themes: ["shame", "forgiveness", "belonging"],
    heroSource: ref(
      "shabad-lord-keeps-the-humble-close",
      [37476, 37477],
      "The humble servant is held close, and the child is cherished.",
      "Welcome begins where nearness becomes more believable than shame."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-forgiveness-opens-the-room" },
      { kind: "daily-guidance", id: "guidance-cherished-like-a-child" },
      { kind: "topic-guide", id: "topic-shame" },
      { kind: "topic-guide", id: "topic-self-worth" },
      { kind: "shabad-deep-dive", id: "shabad-forgiveness-opens-lasting-peace" },
      { kind: "shabad-deep-dive", id: "shabad-lord-keeps-the-humble-close" },
      { kind: "shabad-deep-dive", id: "shabad-child-of-grace" },
    ],
    relatedTopicIds: ["topic-shame", "topic-self-worth", "topic-forgiveness"],
    relatedShabadIds: [
      "shabad-forgiveness-opens-lasting-peace",
      "shabad-lord-keeps-the-humble-close",
      "shabad-child-of-grace",
    ],
  },
  {
    id: "collection-tired-heart-to-rest",
    title: "From a Tired Heart to Rest",
    subtitle: "A slower study path for the overused inner life",
    description: "Begin where the soul is worn thin, then move into company, patient listening, and remembrance that actually eases what the body has been carrying.",
    durationLabel: "4-step arc",
    themes: ["exhaustion", "patience", "rest"],
    heroSource: ref(
      "shabad-search-ends-in-saint-company",
      [3898, 3899, 3900],
      "Search ends in mercy and saint company; the body cools where the right company is found.",
      "Rest arrives less by escape than by better placement."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-wanderings-cease-in-sangat" },
      { kind: "daily-guidance", id: "guidance-patience-listens-longer" },
      { kind: "topic-guide", id: "topic-seeking" },
      { kind: "topic-guide", id: "topic-exhaustion" },
      { kind: "shabad-deep-dive", id: "shabad-search-ends-in-saint-company" },
      { kind: "shabad-deep-dive", id: "shabad-patience-ripens-into-honor" },
      { kind: "shabad-deep-dive", id: "shabad-remembrance-brings-peace" },
    ],
    relatedTopicIds: ["topic-seeking", "topic-exhaustion", "topic-patience"],
    relatedShabadIds: [
      "shabad-search-ends-in-saint-company",
      "shabad-patience-ripens-into-honor",
      "shabad-remembrance-brings-peace",
    ],
  },
  {
    id: "collection-conduct-and-clean-speech",
    title: "Conduct and Clean Speech",
    subtitle: "A sequence for aligning life, tongue, and practice",
    description: "This path keeps speech and conduct together so the archive does not let good words drift too far from the life carrying them.",
    durationLabel: "5-step arc",
    themes: ["speech", "conduct", "honesty"],
    heroSource: ref(
      "shabad-ambrosial-speech-pure-conduct",
      [11742, 11743, 11748, 11749],
      "The best religion appears as pure conduct and speech trained by praise.",
      "Let the tongue and the life answer to the same center."
    ),
    items: [
      { kind: "daily-guidance", id: "guidance-pure-conduct-outweighs-display" },
      { kind: "daily-guidance", id: "guidance-ambrosial-speech-needs-praise" },
      { kind: "topic-guide", id: "topic-conduct" },
      { kind: "topic-guide", id: "topic-softness" },
      { kind: "topic-guide", id: "topic-honesty" },
      { kind: "shabad-deep-dive", id: "shabad-ambrosial-speech-pure-conduct" },
      { kind: "shabad-deep-dive", id: "shabad-speak-what-brings-honor" },
      { kind: "shabad-deep-dive", id: "shabad-buy-what-goes-with-you" },
    ],
    relatedTopicIds: ["topic-conduct", "topic-softness", "topic-honesty"],
    relatedShabadIds: [
      "shabad-ambrosial-speech-pure-conduct",
      "shabad-speak-what-brings-honor",
      "shabad-buy-what-goes-with-you",
    ],
  },
]
