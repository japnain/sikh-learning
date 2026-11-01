import type { BaniDiscoveryEntries, BaniDiscoveryReference } from './baniDiscoveryTypes'

const ang = (page: number): BaniDiscoveryReference => ({
  label: `Sri Guru Granth Sahib Ji · Ang ${page}`,
  url: `https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=${page}`,
})

const collection = (id: number): BaniDiscoveryReference => ({
  label: 'BaniDB reading and source headings',
  url: `https://api.banidb.com/v2/banis/${id}`,
})

const REHAT: BaniDiscoveryReference = {
  label: 'SGPC · Sikh Rehat Maryada',
  url: 'https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf',
}

const BHATT_INTRODUCTION: BaniDiscoveryReference = {
  label: 'Guru Granth Sahib Project · Introduction to Savaiye',
  url: 'https://gurugranthsahib.io/bani/introduction/89/Introduction',
}

/**
 * AI-assisted discovery copy checked against the source headings and passages.
 * These descriptions are editorial context, not scripture or a translation.
 * See docs/qa/2026-10-31-sggs-bani-discovery-research.md for the evidence register.
 */
export const SGGS_BANI_DISCOVERY = {
  1: {
    name: 'Gur Mantar (Waheguru)',
    summary: 'A short reading centred on remembering Waheguru. Its opening citation describes remembrance as a way of loosening ego and turning attention toward the Guru.',
    detail: 'This collection places the Gur Mantar beside a Bhai Gurdas verse and a passage labelled as coming from Sri Sarbloh Granth. Those source headings belong to a gathered reading, rather than one continuous passage of Sri Guru Granth Sahib Ji.',
    references: [collection(1), {
      label: 'Bhai Gurdas · Vaar 13, Pauri 2',
      url: 'https://wahe.world/readings/bhai-gurdas-varan/13/',
    }],
  },
  2: {
    name: 'Japji Sahib',
    summary: 'Guru Nanak Sahib Ji’s opening bani in Sri Guru Granth Sahib Ji asks how to live truthfully. It explores hukam, the Divine order, and a life shaped by remembrance, listening and grace.',
    detail: 'Japji Sahib is part of morning Nitnem. Its opening question gives the whole reading a practical direction: how our understanding and daily conduct can become truthful.',
    references: [ang(1), collection(2), REHAT],
  },
  3: {
    name: 'Shabad Hazare',
    summary: 'Seven shabads expressing longing for the Guru, trust in the Divine and the desire to live in remembrance. The collection opens with Guru Arjan Sahib Ji’s deeply personal language of separation and reunion.',
    detail: 'The reading brings together one shabad by Guru Arjan Sahib Ji and six by Guru Nanak Sahib Ji from several raags. It is a collected sequence; Shabad Hazare Patshahi 10 is a separate work.',
    references: [collection(3)],
  },
  10: {
    name: 'Anand Sahib',
    summary: 'Guru Amar Das Ji’s bani in Raag Ramkali celebrates the joy of meeting the True Guru. Its forty pauris explore how listening to the Shabad and living with remembrance transform the heart.',
    detail: 'The complete composition runs from Ang 917 to 922. A shorter form used in several Sikh services brings together the first five pauris and the final pauri.',
    references: [ang(917), collection(10), REHAT],
  },
  11: {
    name: 'Laavan (The Four Wedding Verses)',
    summary: 'Guru Ram Das Ji’s four Laavan stanzas in Raag Suhi describe a deepening relationship with the Divine, moving through disciplined living, loving devotion and union.',
    detail: 'The Laavan are sung during Anand Karaj. Their marriage imagery joins the shared life of the couple with a spiritual journey guided by the Guru.',
    references: [ang(773), collection(11), {
      label: 'Guru Granth Sahib Project · Introduction to Lavan',
      url: 'https://gurugranthsahib.io/bani/introduction/41/Introduction',
    }],
  },
  14: {
    name: 'Kuchji (The Unskilled Soul-Bride)',
    summary: 'In this Suhi composition, Guru Nanak Sahib Ji gives voice to a soul-bride who sees her own shortcomings and longs for the Beloved. Self-examination becomes a prayer for closeness.',
    detail: 'Kuchji stands beside Suchji on Ang 762. Their contrasting voices offer two ways of considering the relationship between human limitation, love and Divine grace.',
    references: [ang(762), collection(14)],
  },
  15: {
    name: 'Suchji (The Graceful Soul-Bride)',
    summary: 'Guru Nanak Sahib Ji’s companion to Kuchji speaks through a soul-bride who finds her wealth and peace in the Divine. Her confidence rests in accepting the Beloved’s will.',
    detail: 'This short composition in Raag Suhi treats devotion as a relationship of trust. Its closing prayer turns toward the Guru’s Shabad as the way to union.',
    references: [ang(762), collection(15)],
  },
  16: {
    name: 'Gunvanti (The Virtuous Soul-Bride)',
    summary: 'Guru Arjan Sahib Ji’s Suhi composition describes a seeker approaching the Guru’s Sikhs with humility. The speaker asks for guidance, a steady mind and a meeting with the beloved Guru.',
    detail: 'Gunvanti follows Kuchji and Suchji in Sri Guru Granth Sahib Ji. Here, virtue takes the form of willingness to learn and to place oneself in the Guru’s care.',
    references: [ang(763), collection(16)],
  },
  17: {
    name: 'Funehe — Guru Arjan Sahib Ji',
    summary: 'Twenty-three short verses dwell on love, longing and the Divine presence within life. The repeated address Harihan gives Guru Arjan Sahib Ji’s composition a recurring devotional voice.',
    detail: 'Funehe appears near the closing collections of Sri Guru Granth Sahib Ji, on Angs 1361–1363. Its intimate images invite attention to love and remembrance within ordinary experience.',
    references: [ang(1361), ang(1363), collection(17)],
  },
  18: {
    name: 'Choubole — Guru Arjan Sahib Ji',
    summary: 'Eleven brief verses explore the intensity of love and devotion. The opening address to Samman asks whether love could ever be bought, setting its value beyond wealth or bargaining.',
    detail: 'These compact sayings follow Funehe on Angs 1363–1364. Their named addresses and striking images give each verse its own voice within the collection.',
    references: [ang(1363), ang(1364), collection(18)],
  },
  21: {
    name: 'Rehras Sahib (Evening Prayer)',
    summary: 'The evening Nitnem prayer gathers hymns of praise, gratitude and reliance on the Divine. Its sequence offers a way to return attention to the Guru at the close of the day.',
    detail: 'Rehras combines passages from Sri Guru Granth Sahib Ji with Dasam Bani and an Anand Sahib excerpt. Different reading traditions include additional passages, so the selected length determines the sequence shown.',
    references: [REHAT, collection(21)],
  },
  22: {
    name: 'Aarti Aarta',
    summary: 'A gathered reading of praise that includes Guru Nanak Sahib Ji’s cosmic Aarti: the sky becomes the ceremonial tray, the sun and moon its lamps, and creation itself offers worship.',
    detail: 'This reading includes several SGGS and Dasam Bani passages. The Aarti shabad in Raag Dhanasri is one part of that wider sequence, with its own source heading and imagery.',
    references: [ang(663), collection(22)],
  },
  23: {
    name: 'Kirtan Sohila (Night Prayer)',
    summary: 'The bedtime Nitnem prayer turns toward praise, trust and remembrance as the day ends. Its five core shabads contemplate the Creator, the passing of life and the longing for union.',
    detail: 'The core Sohila is on Angs 12–13, with shabads by Guru Nanak Sahib Ji, Guru Ram Das Ji and Guru Arjan Sahib Ji. The selected reading may also include supplementary prayers with separate source headings.',
    references: [ang(12), ang(13), REHAT, collection(23)],
  },
  27: {
    name: 'Barah Maha Majh (The Twelve Months)',
    summary: 'Guru Arjan Sahib Ji uses the cycle of twelve months to explore the soul’s longing for the Divine. Changing seasons become a setting for separation, remembrance and reunion.',
    detail: 'This is the Barah Maha in Raag Majh, beginning on Ang 133. The opening prayer places the seasonal journey within the need for grace and the pain of feeling separated from the Beloved.',
    references: [ang(133), collection(27)],
  },
  30: {
    name: 'Salok Mahalla 9 — Guru Tegh Bahadur Ji',
    summary: 'Guru Tegh Bahadur Ji’s saloks reflect on the brevity of life, attachment and the need to remember the Divine. Their direct language invites steadiness amid change, pleasure and sorrow.',
    detail: 'The collection appears on Angs 1426–1429. Its opening compares loving remembrance to a fish’s dependence on water, giving urgency to the spiritual possibilities of human life.',
    references: [ang(1426), ang(1429), collection(30)],
  },
  31: {
    name: 'Sukhmani Sahib',
    summary: 'Guru Arjan Sahib Ji’s extended composition in Raag Gauri explores peace through remembrance, humility, grace and the company of those devoted to the Divine.',
    detail: 'Its twenty-four ashtpadis each follow a salok and develop their themes through eight stanzas. Keeping these units together makes the movement of the long composition easier to follow.',
    references: [ang(262), ang(296), collection(31)],
  },
  32: {
    name: 'Sukhmana Sahib — Guru Ram Das Ji’s Ashtpadis',
    summary: 'A collection of twenty-four ashtpadis by Guru Ram Das Ji, gathered from Raags Bilaval, Nat, Kanara and Kalyan. They explore remembrance, surrender of ego and the guidance of the Guru.',
    detail: 'Each raag contributes six ashtpadis from a different part of Sri Guru Granth Sahib Ji. Sukhmana Sahib is a distinct collection from Guru Arjan Sahib Ji’s Sukhmani Sahib.',
    references: [collection(32)],
  },
  33: {
    name: 'Bavan Akhri — Guru Arjan Sahib Ji',
    summary: 'An alphabetic composition in Raag Gauri that uses letters as starting points for reflection on the Guru, remembrance and grace. Its opening honours the Guru as teacher, companion and support.',
    detail: 'The repeated salok and pauri arrangement gives this long composition its rhythm. It is distinct from Bhagat Kabir Ji’s Bavan Akhri, which appears elsewhere in the same raag section.',
    references: [ang(250), collection(33)],
  },
  34: {
    name: 'Sidh Gosht (Dialogue with the Siddhs)',
    summary: 'Guru Nanak Sahib Ji’s dialogue with the Siddhs explores spiritual discipline, the mind and freedom from attachment. Questions and responses turn attention toward the Shabad and truthful living.',
    detail: 'The composition is in Raag Ramkali on Angs 938–946. Its conversational form helps the reader follow how each spiritual question leads into the next.',
    references: [ang(938), collection(34)],
  },
  35: {
    name: 'Dakhni Onkar',
    summary: 'Guru Nanak Sahib Ji’s Ramkali composition reflects on the One Creator, learning and spiritual understanding. Its address to the scholar asks what learning becomes when rooted in remembrance.',
    detail: 'Letters provide a poetic framework, while the refrain directs the learner toward the Divine Name. The work begins on Ang 929 and continues through Ang 938.',
    references: [ang(930), ang(938), collection(35)],
  },
  36: {
    name: 'Dukh Bhanjani Sahib',
    summary: 'A collection of Guru Arjan Sahib Ji’s shabads turning toward the Divine in suffering. Its opening refrain places hope in the Naam and in the wisdom of the Guru.',
    detail: 'The reading gathers shabads from Raags Gauri, Bilaval and Sorath. Their language of refuge, relief and gratitude offers devotional support through difficulty.',
    references: [ang(218), collection(36)],
  },
  38: {
    name: 'Raag Mala (Garland of Raags)',
    summary: 'A poetic account of raags and raginis imagined as musical families. Its personified relationships give melody a memorable narrative shape.',
    detail: 'Raag Mala appears on Angs 1429–1430, at the close of Sri Guru Granth Sahib Ji. Its musical imagery is distinct from the headings that organise the preceding scripture into raags.',
    references: [ang(1429), collection(38)],
  },
  39: {
    name: 'Bavan Akhri — Bhagat Kabir Ji',
    summary: 'Bhagat Kabir Ji uses an alphabetic form to explore spiritual understanding and the limits of words. The opening asks how perishable letters can express the Imperishable.',
    detail: 'This composition in Raag Gauri Purbi begins on Ang 340. It shares a literary form with Guru Arjan Sahib Ji’s Bavan Akhri, while remaining a separate composition with its own sequence.',
    references: [ang(340), collection(39)],
  },
  40: {
    name: 'Ghorian (Wedding Songs)',
    summary: 'Guru Ram Das Ji draws on wedding-procession imagery to describe the human body as a horse carrying the seeker toward the Divine. The journey unfolds through remembrance and the Guru’s guidance.',
    detail: 'This reading contains the first of Guru Ram Das Ji’s two Ghorian compositions: four stanzas in Raag Vadahans on Ang 575. Its celebration of the human journey gives the familiar wedding song a spiritual meaning.',
    references: [ang(575), collection(40), {
      label: 'Guru Granth Sahib Project · Ghorian',
      url: 'https://gurugranthsahib.io/bani/Ghoria',
    }],
  },
  41: {
    name: 'Karhale (The Wandering Mind)',
    summary: 'Guru Ram Das Ji addresses the wandering mind as a camel travelling far from home. The poem asks how that restless mind can meet the Divine through the Guru.',
    detail: 'This reading contains the first of Guru Ram Das Ji’s two Karhale compositions: ten stanzas in Raag Gauri Purbi on Ang 234. Its recurring address makes the mind itself the listener.',
    references: [ang(234), collection(41), {
      label: 'Guru Granth Sahib Project · The second Karhala',
      url: 'https://gurugranthsahib.io/bani/details/Karhale/2/2',
    }],
  },
  42: {
    name: 'Birhade (Songs of Longing)',
    summary: 'Guru Arjan Sahib Ji’s composition in Raag Asa gives voice to longing for the Divine. Repeated addresses to the Beloved connect remembrance, devotion and the desire for a meeting.',
    detail: 'The reading spans Angs 431–432 and uses the rhythm of chhants. Its brief verses return to the closeness of the Beloved amid the difficulties of worldly life.',
    references: [ang(432), collection(42)],
  },
  43: {
    name: 'Patti Likhi — Guru Nanak Sahib Ji',
    summary: 'Guru Nanak Sahib Ji turns the letters of a learning tablet into spiritual teaching. Each letter opens a reflection on the Creator, human conduct and the purpose of learning.',
    detail: 'This alphabetic composition in Raag Asa begins on Ang 432. Its first letter points to the One Creator shared by all, placing learning within a larger spiritual responsibility.',
    references: [ang(432), collection(43)],
  },
  44: {
    name: 'Patti — Guru Amar Das Ji',
    summary: 'Guru Amar Das Ji’s alphabetic composition considers impermanence, virtue and the limits of learning without understanding. Its verses ask the learner to recognise the guidance of the Guru.',
    detail: 'This separate Patti follows Guru Nanak Sahib Ji’s composition in Raag Asa, beginning on Ang 434. The author heading distinguishes the two works despite their shared literary form.',
    references: [ang(434), collection(44)],
  },
  45: {
    name: 'Ruti (The Seasons) — Guru Arjan Sahib Ji',
    summary: 'The changing seasons become a setting for Guru Arjan Sahib Ji’s reflections on longing, remembrance and love. Time finds its meaning through a relationship with the Divine.',
    detail: 'This Ramkali composition pairs saloks with chhants on Angs 927–929. Its seasonal cycle offers a different poetic frame from the twelve individual months of Barah Maha.',
    references: [ang(927), ang(929), collection(45)],
  },
  46: {
    name: 'Ramkali Sadd (The Call)',
    summary: 'Baba Sundar Ji recounts Guru Amar Das Ji’s response to the call of death and the succession of Guru Ram Das Ji. The composition centres on acceptance, remembrance and the Guru’s instruction.',
    detail: 'Sadd appears in Raag Ramkali on Angs 923–924. Its six stanzas place the Guru’s departure within trust in the Divine and the continuing guidance of the Guru.',
    references: [ang(923), ang(924), collection(46)],
  },
  47: {
    name: 'Thiti — Bhagat Kabir Ji',
    summary: 'Bhagat Kabir Ji uses the lunar days as a framework for inward reflection. The calendar becomes a way to consider spiritual understanding and freedom from attachment.',
    detail: 'This composition is in Raag Gauri on Angs 343–344. It is distinct from the Thiti compositions of Guru Nanak Sahib Ji and Guru Arjan Sahib Ji.',
    references: [ang(343), ang(344), collection(47)],
  },
  48: {
    name: 'Thiti — Guru Nanak Sahib Ji',
    summary: 'Guru Nanak Sahib Ji’s composition in Raag Bilaval reflects on the lunar days through the oneness of the Creator. Its opening places the Divine beyond birth, social distinctions and limitation.',
    detail: 'The work runs from Ang 838 to 840. Its calendar form is shared with other Thiti compositions, while its author, raag and sequence remain distinct.',
    references: [ang(838), collection(48)],
  },
  49: {
    name: 'Thiti — Guru Arjan Sahib Ji (Gauri)',
    summary: 'Guru Arjan Sahib Ji’s lunar-day composition opens with the Creator present throughout water, land and sky. Its saloks and pauris turn the calendar toward remembrance and devotion.',
    detail: 'The source heading identifies Raag Gauri, and the composition spans Angs 296–300. Read each salok with its following pauri to follow the unfolding reflection.',
    references: [ang(296), collection(49)],
  },
  52: {
    name: 'Vanjara (The Spiritual Trader)',
    summary: 'Guru Ram Das Ji uses the language of a travelling trader to ask what is truly worth gathering in life. The Divine Name becomes the lasting wealth and companion of the seeker.',
    detail: 'This composition in Siri Raag spans Angs 81–82. Its address to the trader invites reflection on the value of our daily choices and pursuits.',
    references: [ang(81), collection(52)],
  },
  77: {
    name: 'Saloks of Bhagat Kabir Ji',
    summary: 'A collection centred on Bhagat Kabir Ji’s short, vivid teachings about remembrance, humility, social pride and the passing of life. Familiar objects and sharp contrasts make the questions immediate.',
    detail: 'The collection begins on Ang 1364 and includes contributions by other voices within its sequence. Keeping the individual author markers preserves that conversation.',
    references: [ang(1364), ang(1377)],
  },
  78: {
    name: 'Saloks of Sheikh Farid Ji',
    summary: 'Sheikh Farid Ji’s saloks reflect on mortality, humility and longing for the Beloved. Their intimate images bring the realities of time and human vulnerability close to the reader.',
    detail: 'The collection begins on Ang 1377. It also contains responses by the Sikh Gurus, identified by their Mahalla headings, so the sequence carries more than one author’s voice.',
    references: [ang(1377), ang(1378), collection(78)],
  },
  79: {
    name: 'Savaiye Sri Mukhbaak — Guru Arjan Sahib Ji, Part 1',
    summary: 'The first group of Guru Arjan Sahib Ji’s own Savaiye opens with praise of the all-pervading Creator. Its expansive language places the world and all beings within the Divine presence.',
    detail: 'Sri Mukhbaak identifies these as the Guru’s own utterances. This group precedes the second Sri Mukhbaak sequence and the Bhatt Savaiye.',
    references: [ang(1385), BHATT_INTRODUCTION],
  },
  80: {
    name: 'Savaiye Sri Mukhbaak — Guru Arjan Sahib Ji, Part 2',
    summary: 'The second group of Guru Arjan Sahib Ji’s own Savaiye reflects on human frailty, attachment and refuge in the Divine. Its opening confronts the uncertainty of the body and worldly security.',
    detail: 'The repeated Sri Mukhbaak Mahalla 5 heading marks a new sequence on Ang 1387. These verses remain distinct from the Bhatt compositions that follow.',
    references: [ang(1387), BHATT_INTRODUCTION],
  },
  81: {
    name: 'Bhatt Savaiye in Praise of Guru Nanak Sahib Ji',
    summary: 'Bhatt Kalya Ji’s praise poetry honours Guru Nanak Sahib Ji. The verses celebrate the Guru’s spiritual wisdom and the transforming power of remembrance.',
    detail: 'The heading names the First Guru as the subject of praise; Bhatt Kalya Ji is the poet. This collection is separate from the preceding Savaiye by Guru Arjan Sahib Ji.',
    references: [ang(1389), BHATT_INTRODUCTION],
  },
  82: {
    name: 'Bhatt Savaiye in Praise of Guru Angad Sahib Ji',
    summary: 'Bhatt Kalya Ji praises Guru Angad Sahib Ji through images of humility, steadiness and spiritual illumination. The opening recalls Guru Nanak Sahib Ji’s blessing upon the Guru.',
    detail: 'Beginning on Ang 1391, this collection honours the Second Guru and the continuity of the Guru’s wisdom. Its heading identifies the Guru being praised.',
    references: [ang(1391), BHATT_INTRODUCTION],
  },
  83: {
    name: 'Bhatt Savaiye in Praise of Guru Amar Das Ji',
    summary: 'Bhatt praise poetry honouring Guru Amar Das Ji. The verses celebrate the Guru’s spiritual stature and the guidance that draws seekers toward the Divine.',
    detail: 'The collection begins on Ang 1392 and brings together several Bhatt voices. The reference to the Third Guru in its heading names the subject of their praise.',
    references: [ang(1392), BHATT_INTRODUCTION],
  },
  84: {
    name: 'Bhatt Savaiye in Praise of Guru Ram Das Ji',
    summary: 'The Bhatt poets honour Guru Ram Das Ji in a sustained collection of praise. Their verses express devotion to the Guru and celebrate the grace found through the Guru’s guidance.',
    detail: 'This collection begins on Ang 1396. Its Fourth Guru heading distinguishes the person praised, while the poets’ names identify the different voices within the verses.',
    references: [ang(1396), BHATT_INTRODUCTION],
  },
  85: {
    name: 'Bhatt Savaiye in Praise of Guru Arjan Sahib Ji',
    summary: 'Bhatt praise poetry honouring Guru Arjan Sahib Ji. The collection opens by connecting remembrance of the Guru with the clearing of doubt and the heart’s spiritual renewal.',
    detail: 'Beginning on Ang 1406, these Savaiye are composed by the Bhatts in praise of the Fifth Guru. The Sri Mukhbaak Savaiye by Guru Arjan Sahib Ji form separate earlier sequences.',
    references: [ang(1406), BHATT_INTRODUCTION],
  },
} satisfies BaniDiscoveryEntries
