import type { Bani } from '../data/banis'

export type ReaderEditorialResearchSource = {
  label: string
  url: string
  note: string
}

export type ReaderEditorialResearch = {
  premise: string
  context: string
  usage: string
  sourceLine?: string
  extraSources?: ReaderEditorialResearchSource[]
}

const SGPC_REHAT: ReaderEditorialResearchSource = {
  label: 'SGPC Sikh Rehat Maryada',
  url: 'https://sgpc.net/storage/2026/06/Sikh_Rehat_Maryada_English.pdf',
  note: 'Used for prescribed Nitnem, Ardaas, Hukam, congregational practice, and ceremony context.',
}

const JAPU_OVERVIEW: ReaderEditorialResearchSource = {
  label: 'Punjabi University Encyclopedia: Japu',
  url: 'https://eos.learnpunjabi.org/JAPU.html',
  note: 'Used for the composition’s structure, authorship, scriptural place, and liturgical role.',
}

const SUKHMANI_OVERVIEW: ReaderEditorialResearchSource = {
  label: 'Punjabi University Encyclopedia: Sukhmani',
  url: 'https://eos.learnpunjabi.org/SUKHMANI.html',
  note: 'Used for the 24-ashtpadi structure, authorship, themes, and historical context.',
}

const BHATT_BANI_OVERVIEW: ReaderEditorialResearchSource = {
  label: 'Encyclopedia of Sikhism: Bhatt Bani',
  url: 'https://www.thesikhencyclopedia.com/bhatt-bani/',
  note: 'Used to distinguish the Bhatts who composed these Savaiyye from the Gurus praised in their headings.',
}

const DASAM_OVERVIEW: ReaderEditorialResearchSource = {
  label: 'Punjabi University Encyclopedia: Dasam Granth',
  url: 'https://eos.learnpunjabi.org/DASAM%20GRANTH%20.html',
  note: 'Used for collection-level context while preserving uncertainty around individual recensions and supplementary texts.',
}

const MANUAL_RESEARCH_BY_ID: Record<string, ReaderEditorialResearch> = {
  'japji-sahib': {
    premise: 'Japji Sahib opens Sri Guru Granth Sahib Ji with Mool Mantar, an opening salok, 38 pauris, and a closing salok. Guru Nanak Sahib Ji asks how truthful living becomes possible and answers through hukam, naam, listening, inner assent, and grace.',
    context: 'Its position on Angs 1–8 and its place in morning Nitnem make Japji Sahib foundational to Sikh daily prayer. The sequence moves deliberately, and the five khands near its close give disciplined form to spiritual growth.',
    usage: 'Traditionally recited at amrit vela and during Amrit Sanchar. Read the pauris in order, since each turn develops the questions and vocabulary carried by the one before it.',
    extraSources: [JAPU_OVERVIEW, SGPC_REHAT],
  },
  'rehras-sahib': {
    premise: 'Rehras Sahib is the evening Nitnem prayer, a liturgical sequence that gathers SGGS shabads with Benti Chaupai, Savaiyya and Dohira, an Anand Sahib excerpt, Mundavani, and Salok Mahalla 5 in the standard described by the Sikh Rehat Maryada.',
    context: 'Rehras Sahib is a composite prayer rather than one continuous passage of Sri Guru Granth Sahib Ji. Its movements turn the close of day toward gratitude, strength, reliance on naam, and renewed steadiness.',
    usage: 'Traditionally recited around sunset. Follow each heading and source change, and use the length control as a recension choice while keeping the selected sequence intact.',
    sourceLine: 'Evening Nitnem · Composite SGGS and Dasam Bani reading',
    extraSources: [SGPC_REHAT],
  },
  'kirtan-sohila': {
    premise: 'The core Kirtan Sohila consists of five shabads on SGGS Angs 12–13: three by Guru Nanak Sahib Ji, one by Guru Ram Das Ji, and one by Guru Arjan Sahib Ji. The prayer meets night with praise, impermanence, surrender, and trust in the Divine presence.',
    context: 'Sohila is the prescribed bedtime Nitnem prayer. This reader route may also include Rakhiya de Shabad material from noncontiguous Angs, so the source headings distinguish the five-shabad core from the wider selected reading.',
    usage: 'Recite it before sleep with an unhurried pace. When the longer reader setting is active, keep the added protection shabads in their own source context.',
    sourceLine: 'Night Nitnem · Core Sohila at SGGS Angs 12–13; route may include Rakhiya de Shabad',
    extraSources: [
      SGPC_REHAT,
      {
        label: 'Punjabi University Encyclopedia: Sohila',
        url: 'https://eos.learnpunjabi.org/SOHILA.html',
        note: 'Used for the five-shabad structure, Guru authorship markers, source location, and bedtime practice.',
      },
    ],
  },
  'anand-sahib': {
    premise: 'Anand Sahib is Guru Amar Das Ji’s 40-pauri composition in Raag Ramkali on Angs 917–922. Its anand is the deep joy of hearing the Shabad, meeting the True Guru, and ordering life around naam.',
    context: 'The full composition and a six-pauri form both appear in Sikh practice. The Sikh Rehat Maryada uses the first five pauris and the final pauri in several services, while the complete bani preserves the full devotional movement.',
    usage: 'Read the full 40 pauris when the setting allows. In a ceremony or shorter Nitnem sequence, keep the first-five-plus-final form clear so an excerpt is never mistaken for the complete composition.',
    extraSources: [
      SGPC_REHAT,
      {
        label: 'Punjabi University Encyclopedia: Anandu',
        url: 'https://eos.learnpunjabi.org/ANANDU.html',
        note: 'Used for authorship, the 40-pauri form, source range, and ceremonial use.',
      },
    ],
  },
  'barah-maha-majh': {
    premise: 'Barah Maha Majh is Guru Arjan Sahib Ji’s seasonal composition on Angs 133–136. Its 12-month cycle gives the soul-bride’s separation, remembrance, grace, and union a changing landscape of heat, rain, harvest, and renewal.',
    context: 'The heading reads Barah Maha Majh Mahalla 5, which distinguishes it from Guru Nanak Sahib Ji’s Barah Maha in Raag Tukhari. The calendar supplies the poetic frame; Divine remembrance gives each month its meaning.',
    usage: 'Read the opening and closing stanzas with the twelve months. A month can support seasonal reflection, but the complete cycle shows how longing matures into nearness through grace.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Barah Maha',
      url: 'https://eos.learnpunjabi.org/BARAH%20MAHA.html',
      note: 'Used to distinguish the Majh and Tukhari compositions and to verify the seasonal form.',
    }],
  },
  'bavan-akhri': {
    premise: 'Bavan Akhri Mahalla 5 is Guru Arjan Sahib Ji’s alphabet-shaped teaching in Raag Gauri on Angs 250–262. Its 55 pauris, with preceding saloks, use letters as thresholds into grace, naam, humility, and the Guru’s wisdom.',
    context: 'The title names an alphabetic form rather than a promise of exactly 52 stanzas. The source heading and repeated salok-pauri pattern keep the composition ordered and cumulative.',
    usage: 'Move letter by letter and keep each salok with its pauri. The formal sequence rewards slower reading and makes a stronger study unit than isolated lines.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Bavan Akhari',
      url: 'https://eos.learnpunjabi.org/BAVAN%20AKHARI.html',
      note: 'Used for the alphabetic form, Guru Arjan Sahib Ji’s authorship, and the 55-pauri structure.',
    }],
  },
  'sukhmani-sahib': {
    premise: 'Sukhmani Sahib is Guru Arjan Sahib Ji’s composition in Raag Gauri on Angs 262–296. Twenty-four ashtpadis, each led by a salok and formed from eight stanzas, dwell on naam, grace, humility, saintly company, and inner steadiness.',
    context: 'Its structure matters as much as its familiar title. Each salok opens a theme that the following ashtpadi develops, and the repeated form gives the long reading unity without reducing it to one slogan about peace.',
    usage: 'Read one complete salok-ashtpadi unit at a time when a full sitting is not possible. Preserve all 24 units for complete recitation, and keep neighbouring stanzas with any line saved for study.',
    extraSources: [SUKHMANI_OVERVIEW],
  },
  'asa-di-var': {
    premise: 'Asa Di Vaar centres on Guru Nanak Sahib Ji’s 24 pauris with attached saloks, chiefly from Mahalla 1 and Mahalla 2. It presses hukam, wonder, equality, truthful conduct, and clear-eyed criticism of hypocrisy into the first hours of the day.',
    context: 'The core Vaar stands on Angs 462–475. The traditional sung sequence may begin with chhants from Ang 448, which explains why this reader can open earlier than the core composition.',
    usage: 'Traditionally sung in early-morning sangat. Keep each pauri with its attached saloks, and treat the prefatory chhants as part of the performance sequence rather than part of the 24-pauri core.',
    sourceLine: 'Traditional Asa Di Vaar reading · Core Vaar at SGGS Angs 462–475',
    extraSources: [SGPC_REHAT],
  },
  ghorian: {
    premise: 'Ghorian is Guru Ram Das Ji’s four-stanza composition in Raag Vadahans on Ang 575. Wedding-mare imagery becomes a meditation on disciplined departure, the human journey, and union under the Guru’s guidance.',
    context: 'The source heading reads Vadahans Mahalla 4 Ghorian. Its social song-form remains visible, yet the journey it describes reaches beyond a wedding custom into the soul’s preparation for the Beloved.',
    usage: 'Read the four stanzas as one lyric movement. When studied beside Laavan or other marriage-linked bani, keep each composition’s distinct heading and purpose clear.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Ghorian',
      url: 'https://eos.learnpunjabi.org/GHORIAN.html',
      note: 'Used for the four-stanza form, source location, authorship, and wedding-song imagery.',
    }],
  },
  onkar: {
    premise: 'Dakhni Onkar is Guru Nanak Sahib Ji’s 54-stanza teaching in Raag Ramkali on Angs 929–938. It opens with Oankar as Creator and tests learning against lived realization, naam, and the One from whom creation unfolds.',
    context: 'The source heading reads Ramkali Mahalla 1 Dakhni Oankar. Its extended instruction moves through letters, learning, creation, and spiritual authority without treating scholarship alone as wisdom.',
    usage: 'Read it as a sustained teaching composition. Keep the opening Oankar frame and stanza order visible as the argument passes from language into conduct and realization.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Onkar',
      url: 'https://eos.learnpunjabi.org/ONKAR.html',
      note: 'Used for the Oankar frame and the composition’s theological setting.',
    }],
  },
  'sidh-gosht': {
    premise: 'Sidh Gosht is Guru Nanak Sahib Ji’s 73-stanza dialogue with the Nath Siddhas in Raag Ramkali on Angs 938–946. Questions about yoga, detachment, authority, and liberation meet an answer rooted in naam, Shabad, and disciplined life in the world.',
    context: 'The dialogue form carries the meaning. Speaker changes and questions show where Guru Nanak Sahib Ji accepts a concern, rejects an outward claim, or redirects yoga toward the Guru.',
    usage: 'Read question and answer together. A saved line should retain enough surrounding dialogue to show who speaks and what claim the response addresses.',
  },
  'dukh-bhanjani': {
    premise: 'Dukh Bhanjani Sahib is a later devotional anthology of SGGS shabads, largely from Guru Arjan Sahib Ji, gathered from noncontiguous Angs. Readers turn to this selection for prayerful steadiness and comfort amid suffering.',
    context: 'Sri Guru Granth Sahib Ji contains these shabads in their own raags and source locations; Dukh Bhanjani is the name of the assembled reading tradition. The collection spans far beyond a single Ang 218–220 passage.',
    usage: 'Receive the selection as Gurbani and supplication, without treating recitation as a guaranteed medical outcome. Keep each shabad’s raag, writer, and full source context visible.',
    sourceLine: 'Devotional anthology · Selected shabads across Sri Guru Granth Sahib Ji',
  },
  'thiiti-majh': {
    premise: 'Thiti Mahalla 5 is Guru Arjan Sahib Ji’s 17-stanza composition in Raag Gauri on Angs 296–300. Lunar dates become a frame for naam, grace, ethical practice, and life under the Guru.',
    context: 'The exact heading is Thiti Gauri Mahalla 5. The former label “Thiiti (Majh)” confused its raag and has been corrected while the stable catalog identifier remains unchanged.',
    usage: 'Read the dates as poetic structure rather than an auspicious-day calendar. Follow the full cycle and the source heading before comparing it with the Thiti compositions of Guru Nanak Sahib Ji or Bhagat Kabir Ji.',
  },
  birhade: {
    premise: 'Birhade is Guru Arjan Sahib Ji’s eight-stanza chhant in Raag Asa on Angs 431–432. Its language of separation gives longing a firm direction toward Divine refuge, grace, and the Beloved’s presence.',
    context: 'The heading reads Asa Mahalla 5 Birhade. Earlier catalog copy placed it at Angs 557–558; the source text confirms Angs 431–432.',
    usage: 'Read all eight stanzas as a single song of longing. Keep the chhant form and rahao line close when studying its emotional turns.',
  },
  aarti: {
    premise: 'This Aarti–Aarta route is a multi-source devotional anthology. At its heart stands Guru Nanak Sahib Ji’s cosmic Aarti on SGGS Ang 663, where sky, sun, moon, stars, wind, and fragrance join creation-wide praise.',
    context: 'The reader also gathers later SGGS and Dasam-tradition passages used in Aarti–Aarta practice. Their headings preserve distinct authors, sources, and voices; the collection itself has no single collective author.',
    usage: 'Begin with the source heading of each movement. Keep Guru Nanak Sahib Ji’s Ang 663 shabad distinct from the wider anthology while allowing the complete sequence to unfold as sung praise.',
    sourceLine: 'Aarti–Aarta reading set · SGGS and Dasam-tradition passages',
  },
  laavan: {
    premise: 'Laavan is Guru Ram Das Ji’s four-stanza composition in Raag Suhi on Angs 773–774. In Anand Karaj, each laav is sung as the couple circles Sri Guru Granth Sahib Ji; the text traces a deeper movement through Shabad toward Divine union.',
    context: 'The four rounds belong to one composition and one spiritual progression. The Sikh Rehat Maryada places them within a ceremony centred on shared Guru-oriented household life.',
    usage: 'Read all four laavan in order. For wedding preparation, pair the text with the Anand Karaj guidance so the ceremony’s spiritual commitments remain larger than decorative wedding language.',
    extraSources: [
      SGPC_REHAT,
      {
        label: 'Punjabi University Encyclopedia: Anand Karaj',
        url: 'https://eos.learnpunjabi.org/ANAND%20KARAJ.html',
        note: 'Used for the four-round ceremony and its relationship to Guru Ram Das Ji’s Laavan.',
      },
    ],
  },
  'ramkali-sadd': {
    premise: 'Ramkali Sadd is Bhai Sundar Ji’s six-stanza composition on Angs 923–924. It remembers Guru Amar Das Ji’s passing, rejects ritual wailing, receives death within hukam, and records the succession of Guru Ram Das Ji.',
    context: 'The heading names Sadd rather than a Mahalla author. Its place in Sri Guru Granth Sahib Ji gives a rare community voice to grief, continuity, and the Guru’s instruction at death.',
    usage: 'Often read in bereavement. Keep all six stanzas together so counsel on grief, hukam, and succession is heard as one movement rather than a detached funeral line.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Ramkali Sadu',
      url: 'https://eos.learnpunjabi.org/RAMKALI%20SADU.html',
      note: 'Used for Bhai Sundar Ji’s authorship, the six-stanza form, and bereavement context.',
    }],
  },
  funehe: {
    premise: 'Funehe Mahalla 5 is Guru Arjan Sahib Ji’s 23-quatrain composition on Angs 1361–1363. A recurring refrain carries the soul-bride’s longing through naam, saintly company, humility, and love of the Divine.',
    context: 'The source heading assigns Mahalla 5 and the numbered quatrains form a single refrain-led sequence. Its compressed images need their repeated line and neighbouring verse.',
    usage: 'Read the quatrains in order and let the refrain return each image to its devotional centre. Preserve the full quatrain when saving or sharing a line.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Phunhe',
      url: 'https://eos.learnpunjabi.org/PHUNHE.html',
      note: 'Used for authorship, the 23-quatrain structure, and refrain form.',
    }],
  },
  choubole: {
    premise: 'Choubole Mahalla 5 is Guru Arjan Sahib Ji’s compact sequence on Angs 1363–1364. Its named figures and vivid scenes examine love, attachment, humility, and steadfast devotion through tightly worked couplets and stanzas.',
    context: 'The title names a poetic form, not merely “four-line verses.” The source heading and numbered units hold together images that can look like separate sayings when stripped from the sequence.',
    usage: 'Read each numbered unit whole and keep unfamiliar names with the surrounding image. Brief historical notes can assist study, but the Gurbani line remains the centre.',
  },
  'salok-bhagat-kabir': {
    premise: 'Salok Bhagat Kabir Jio Ke is a Kabir-centred sequence on Angs 1364–1377. Its sharp, earthy saloks confront ego, mortality, false display, and ethical failure while returning the reader to direct remembrance.',
    context: 'The numbered sequence also contains explicit response saloks marked Mahalla 3 and Mahalla 5 near its close. The heading names the principal collection, while the internal markers preserve each contributing voice.',
    usage: 'Read salok by salok with the Mahalla labels visible. When a Guru response appears, keep it beside the Kabir Ji salok it answers or reframes.',
  },
  'salok-farid': {
    premise: 'Salok Sheikh Farid Ji is a Farid-centred sequence on Angs 1377–1384. Images of age, dust, hunger, tenderness, and separation give humility and remembrance a spare physical weight.',
    context: 'The 130-numbered sequence includes response saloks marked Mahalla 3 and Mahalla 5. The heading honours Sheikh Farid Ji while the internal authorship markers prevent every line from being assigned to one voice.',
    usage: 'Read slowly and retain the earthy image. Keep each Guru response with its neighbouring Farid Ji salok so dialogue remains visible.',
  },
  'salok-mahalla-9': {
    premise: 'Salok Mahalla 9 gathers 57 saloks of Guru Tegh Bahadur Ji on Angs 1426–1429. Their compressed counsel faces impermanence, fear, attachment, dignity, and naam with unusual directness.',
    context: 'The sequence stands near the close of Sri Guru Granth Sahib Ji and was incorporated under Guru Gobind Singh Ji. Its stark tone joins detachment to fearlessness rather than withdrawal from moral life.',
    usage: 'Read one salok at a time, then return it to the full sequence. These brief forms invite reflection, but their force weakens when used as isolated slogans.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Salok Mahalla 9',
      url: 'https://eos.learnpunjabi.org/SALOK%20MAHALLA%209%20.html',
      note: 'Used for the 57-salok structure, authorship, source range, and central concerns.',
    }],
  },
  'raag-maala': {
    premise: 'Raag Mala closes Sri Guru Granth Sahib Ji on Angs 1429–1430 with a “garland” of raag names arranged through family imagery. Its form is a catalogue in verse rather than a summary of every musical measure used in the scripture.',
    context: 'Authorship and recitation have long been discussed within the Panth. The complete printed saroop retains Raag Mala, while the Sikh Rehat Maryada records established differences in where bhog may be concluded.',
    usage: 'Read it at its scriptural location with care for local maryada. The app presents the text and its title without attempting to settle a living Panthic discussion.',
    extraSources: [
      SGPC_REHAT,
      {
        label: 'Punjabi University Encyclopedia: Ragmala',
        url: 'https://eos.learnpunjabi.org/RAGMALA.html',
        note: 'Used for the closing location, garland form, and history of the discussion around authorship and recitation.',
      },
    ],
  },
  'gur-mantar': {
    premise: 'Gur Mantar is a compact assembled reading centred on “Waheguru.” It joins the Bhai Gurdas Ji Vaar 13 line naming Waheguru as gurmantar with a passage attributed in the reader to the Sarbloh Granth tradition.',
    context: 'This is a later reader-made anthology, not a contiguous composition from SGGS Ang 13. Its source labels matter because the two supporting passages come from different textual traditions.',
    usage: 'Use it as a short doorway into simran. Keep “Waheguru” central, and retain the Bhai Gurdas Ji and Sarbloh-attributed source notes when studying the supporting lines.',
    sourceLine: 'Gur Mantar reading set · Bhai Gurdas Vaar 13 and Sarbloh-attributed passage',
    extraSources: [
      SGPC_REHAT,
      {
        label: 'Punjabi University Encyclopedia: Vahiguru',
        url: 'https://eos.learnpunjabi.org/VAHIGURU.html',
        note: 'Used for the history and Sikh usage of the name Vahiguru.',
      },
    ],
  },
  'shabad-hazare': {
    premise: 'Shabad Hazare is a later gutka anthology of seven noncontiguous SGGS shabads: the first by Guru Arjan Sahib Ji and the following six by Guru Nanak Sahib Ji. Longing, Divine presence, surrender, and praise bind the selected hymns without making them one scriptural composition.',
    context: '“Shabad Hazare” is the collection title; it does not appear as a single heading in Sri Guru Granth Sahib Ji. Each shabad keeps its own raag, Mahalla, Ang, and complete form.',
    usage: 'Read the seven shabads as a curated sequence, then open any one in its full SGGS setting for close study. Preserve the source heading whenever a line is saved or shared.',
    sourceLine: 'Seven-shabad anthology · Noncontiguous SGGS source locations',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Shabad Hazare',
      url: 'https://eos.learnpunjabi.org/SHABAD%20%28SABAD%29%20HAJARE.html',
      note: 'Used for the seven-shabad composition of the anthology and its Guru authorship markers.',
    }],
  },
  kuchji: {
    premise: 'Kuchji is Guru Nanak Sahib Ji’s short composition in Raag Suhi on Ang 762. The self-aware soul-bride names her faults and turns that recognition toward mercy rather than despair.',
    context: 'Kuchji begins a closely related sequence with Suchji and Gunvanti. The first two carry Mahalla 1, while Gunvanti carries Mahalla 5, so the shared imagery does not erase distinct authorship.',
    usage: 'Read it beside Suchji and Gunvanti. The three-part movement from unskillfulness through truthful orientation to virtue gives this brief bani its fuller contour.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Kuchaji',
      url: 'https://eos.learnpunjabi.org/KUCHAJI.html',
      note: 'Used for authorship, the soul-bride frame, and the relation to Suchji.',
    }],
  },
  suchji: {
    premise: 'Suchji is Guru Nanak Sahib Ji’s paired Suhi composition on Ang 762. The “true” soul-bride lives in remembrance, humility, and the Guru’s Shabad, placing belonging in grace rather than status.',
    context: 'Its heading follows Kuchji directly and keeps Mahalla 1. The answer gains depth when heard beside Kuchji’s confession and the Mahalla 5 composition Gunvanti that follows.',
    usage: 'Read the three Suhi pieces in sequence. Let the paired language correct any reading that turns “true” or “worthy” into social respectability.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Suchaji',
      url: 'https://eos.learnpunjabi.org/SUCHAJI%20%28SUCHAJJI%29%20.html',
      note: 'Used for the paired structure, authorship, and devotional meaning of Suchji.',
    }],
  },
  gunvanti: {
    premise: 'Gunvanti is Guru Arjan Sahib Ji’s Suhi composition on Ang 763. Spiritual worth appears through humility, reverence for the Guru’s Sikhs, freedom from pride, and love directed toward the Divine.',
    context: 'The heading changes to Mahalla 5 after the Mahalla 1 pair Kuchji and Suchji. The shared soul-bride language links the cluster while the Mahalla marker preserves the new voice.',
    usage: 'Read it after Kuchji and Suchji. Keep humility and grace at the centre when reflecting on the language of virtue.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Gunvanti',
      url: 'https://eos.learnpunjabi.org/GUNVANTI.html',
      note: 'Used for Guru Arjan Sahib Ji’s authorship and the composition’s account of spiritual worth.',
    }],
  },
  'sukhmana-sahib': {
    premise: 'Sukhmana Sahib is a later anthology of 24 ashtpadis by Guru Ram Das Ji, six each from Raag Bilaval, Nat and Nat Narayan, Kanara, and Kalyan. The route gathers related forms from four noncontiguous SGGS regions.',
    context: 'No continuous SGGS composition carries this anthology title from Ang 833 to Ang 1326. Each ashtpadi retains its original raag, heading, and source location.',
    usage: 'Use the collection as a guided anthology. Read one complete ashtpadi at a time and keep every raag transition visible.',
    sourceLine: 'Twenty-four-ashtpadi anthology · Guru Ram Das Ji selections across four raags',
  },
  'bavan-akhri-kabir': {
    premise: 'Bavan Akhri Kabir Ji is Bhagat Kabir Ji’s alphabetic teaching in Raag Gauri on Angs 340–343. Its 45 stanzas press beyond literal scholarship and outward forms toward naam and direct knowledge of the Divine.',
    context: 'The title names the alphabetic method rather than an exact stanza count. This is distinct from Guru Arjan Sahib Ji’s longer Bavan Akhri Mahalla 5.',
    usage: 'Read letter by letter and compare the two Bavan Akhri compositions without merging their voices. Preserve the opening heading when saving a stanza.',
  },
  karhale: {
    premise: 'Karhale is the first ten-verse Guru Ram Das Ji composition under the Gauri Purbi Mahalla 4 Karhale heading on Ang 234. The restless mind appears as a camel that needs the Guru, Shabad, and sangat to leave the burden of haumai.',
    context: 'Sri Guru Granth Sahib Ji contains two ten-verse Karhale compositions; this route opens the first. The caravan and camel images carry spiritual discipline through ordinary travel language.',
    usage: 'Read the ten verses as one address to the wandering mind. Keep the metaphor intact before turning one camel image into a free-standing maxim.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Karhale',
      url: 'https://eos.learnpunjabi.org/KARHALE.html',
      note: 'Used for the two-composition distinction, authorship, form, and camel metaphor.',
    }],
  },
  'patti-likhi': {
    premise: 'Patti Likhi is Guru Nanak Sahib Ji’s 35-stanza alphabet-led teaching in Raag Asa on Angs 432–434. The writing board becomes a school for remembrance, mortality, karma, and true learning under the One.',
    context: 'The source heading reads Raag Asa Mahalla 1 Patti Likhi. Its letters organize instruction, but realization and conduct decide whether learning has taken root.',
    usage: 'Read the alphabet sequence in order. Keep each letter-led stanza whole and compare it with Patti Mahalla 3 only after its own argument is clear.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Patti',
      url: 'https://eos.learnpunjabi.org/PATTI.html',
      note: 'Used for the school-board form, alphabetic structure, and relation between the two Patti compositions.',
    }],
  },
  'patti-mahalla-3': {
    premise: 'Patti Mahalla 3 is Guru Amar Das Ji’s 18-stanza alphabetic composition in Raag Asa on Angs 434–435. It addresses learning directly and measures knowledge by humility, naam, the Guru, and liberation from ego.',
    context: 'The composition follows Guru Nanak Sahib Ji’s Patti Likhi while carrying its own Mahalla 3 voice. The shared classroom form makes comparison useful without making the two texts interchangeable.',
    usage: 'Read it as instruction to both teacher and student. Keep the complete stanza with its letter and compare the Mahalla 1 and Mahalla 3 treatments with their headings visible.',
  },
  'ruti-mahalla-5': {
    premise: 'Ruti Mahalla 5 is Guru Arjan Sahib Ji’s seasonal composition in Raag Ramkali on Angs 927–929. Eight salok–chhant units move through the six seasons, where naam and sangat can make every season blessed.',
    context: 'The source heading reads Ramkali Mahalla 5 Ruti. Seasonal change carries the soul-bride’s longing, but the text locates renewal in remembrance rather than weather alone.',
    usage: 'Read the saloks with the seasonal stanzas. A single season can guide reflection, while the full cycle shows how the same spiritual need persists through change.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Ruti',
      url: 'https://eos.learnpunjabi.org/RUTI%20%28RUTTI%29.html',
      note: 'Used for authorship, the six-season frame, and the salok-stanza structure.',
    }],
  },
  'thitanti-kabir': {
    premise: 'Thitanti Kabir Ji is Bhagat Kabir Ji’s 16-stanza composition in Raag Gauri on Angs 343–344. Lunar dates become a disciplined frame for inward remembrance rather than ritual calculation.',
    context: 'The heading identifies both the Gauri setting and Kabir Ji’s voice. Its calendar language belongs beside the neighbouring alphabetic and weekday forms without becoming an almanac.',
    usage: 'Follow the lunar sequence and keep its spiritual redirection clear. Compare it with the Thiti compositions of Mahalla 1 and Mahalla 5 only after preserving each heading.',
  },
  'thiti-mahalla-1': {
    premise: 'Thiti Mahalla 1 is Guru Nanak Sahib Ji’s 20-stanza composition in Raag Bilaval on Angs 838–840. The lunar-day form turns attention from auspicious calculation toward Divine presence and naam.',
    context: 'The heading reads Bilaval Mahalla 1 Thiti. Calendar terms structure the teaching while the text tests every day against remembrance and truthful orientation.',
    usage: 'Read the cycle as a whole. Keep the date imagery as form, and resist using individual stanzas to restore the very superstition the composition redirects.',
  },
  'gauri-vaar-kabir': {
    premise: 'Gauri Vaar Kabir Ji Ke 7 is Bhagat Kabir Ji’s weekday composition on Angs 344–345. Here vaar means a day of the week: Sunday through Saturday lead into a concluding eighth stanza.',
    context: 'This is a calendrical teaching, not a pauri-and-salok ballad. Each day becomes an occasion for inward discipline and remembrance rather than ritual advantage.',
    usage: 'Read the seven-day sequence and its conclusion together. Preserve the weekday order when comparing it with Bilaval Mahalla 3 Vaar Sat.',
  },
  'bilaval-mahalla-3-vaar-sat': {
    premise: 'Bilaval Mahalla 3 Vaar Sat is Guru Amar Das Ji’s ten-stanza weekday composition on Angs 841–842. It turns the seven days and a concluding reflection toward naam, Shabad, and daily practice.',
    context: 'Vaar Sat refers to the weekdays, not the SGGS ballad form built from pauris and attached saloks. The composition challenges ritual dependence on a “good” day by asking how each day is lived.',
    usage: 'Read the weekday cycle in order. Compare it with Kabir Ji’s Gauri weekday composition while keeping the different raag and author headings clear.',
  },
  vanjara: {
    premise: 'Vanjara is Guru Ram Das Ji’s six-stanza composition in Siri Raag on Angs 81–82. The trader-friend metaphor weighs naam as lasting capital against possessions that cannot travel beyond death.',
    context: 'The heading reads Siri Raag Mahalla 4 Vanjara. Commerce language gives spiritual accounting a concrete shape: the Guru guides what is worth acquiring and carrying.',
    usage: 'Read all six stanzas as one address to the trader-soul. Keep the market metaphor intact when reflecting on honest profit, mortality, and remembrance.',
  },
  'raag-ramkali-sadd': {
    premise: 'This Ramkali route gathers three distinct movements across Angs 923–974: Bhai Sundar Ji’s Sadd, the Vaar of Rai Balvand Ji and Satta Ji, and the Ramkali Bhagat Bani cluster.',
    context: 'The range is a source grouping rather than one composition or one author. Headings mark the transition from six-stanza Sadd, to the eight-pauri Vaar, to shabads by Bhagats including Kabir Ji, Namdev Ji, Ravidas Ji, and Beni Ji.',
    usage: 'Treat each heading as a new reading unit. Keep writer and form visible, especially when moving from historical remembrance into Bhagat Bani.',
  },
  'var-ramkali-rai-balvand': {
    premise: 'Ramkali Ki Vaar Rai Balvand Tatha Satta is an eight-pauri composition by Rai Balvand Ji and Satta Ji on Angs 966–968. It celebrates one spiritual light through the Gurus and remembers the institutions of the growing Panth, including langar.',
    context: 'This Vaar carries no Mahalla author and no attached saloks. Its own heading names the two contributors, making it distinct from the Guru-authored pauri vaars that surround it.',
    usage: 'Read all eight pauris in order. Preserve the named authors and historical movement when using a line about Guruship, succession, or community.',
    extraSources: [{
      label: 'Encyclopedia of Sikhism: Ramkali Ki Var',
      url: 'https://www.thesikhencyclopedia.com/ramkali-ki-var/',
      note: 'Used for the authorship, eight-pauri form, and historical themes.',
    }],
  },
  'jaap-sahib': {
    premise: 'Jaap Sahib is the 199-stanza opening praise composition of the Dasam tradition, headed Sri Mukhvaak Patshahi 10 and traditionally attributed to Guru Gobind Singh Ji. Ten metres and a wide Indic and Persian-Arabic vocabulary name the Divine while refusing every limiting form.',
    context: 'Its movement comes through rhythm, accumulation, and negation of fixed boundaries. The Sikh Rehat Maryada places Jaap Sahib in morning Nitnem and in the preparation of Amrit.',
    usage: 'Read the full cadence rather than extracting one Divine name as a complete definition. Pronunciation and metre matter, so use audio or line-by-line support without rushing the sequence.',
    extraSources: [SGPC_REHAT, DASAM_OVERVIEW],
  },
  'tav-prasad-savaiye': {
    premise: 'Tav Prasad Savaiye, beginning Sraavag Suddh, is the set of ten Savaiyye from Akal Ustat prescribed in morning Nitnem. The verses expose pride in labels, ritual, and outward display while calling for sincere love of the One.',
    context: 'This is the Sraavag Suddh set named by the Sikh Rehat Maryada. It is distinct from the separate Dheenan Ki selection, even though both carry the Tav Prasad Savaiye title in reader catalogs.',
    usage: 'Read all ten Savaiyye as one critique and one call to devotion. Keep the variant label visible so the prescribed set is never collapsed into Dheenan Ki.',
    sourceLine: 'Akal Ustat · Dasam Bani Angs 11–13 · Sraavag Suddh set',
    extraSources: [SGPC_REHAT],
  },
  'chaupai-sahib': {
    premise: 'Benti Chaupai Sahib is a supplicatory passage in the Dasam tradition, headed Patshahi 10. Its direct plea seeks Divine shelter, courage, clarity, and release from fear.',
    context: 'The Sikh Rehat Maryada specifies the standard excerpt used in Rehras, from Hamri karo hath dai rachha through Dusht dokh te leho bachai. Gutka recensions and reader length settings can add different closing passages.',
    usage: 'Read the selected length as prayer, with its beginning and ending made clear. Receive its protective language as reliance on the Divine, without turning recitation into a magical guarantee.',
    sourceLine: 'Benti Chaupai · Dasam Bani tradition · Reader endings vary by selected length',
    extraSources: [SGPC_REHAT],
  },
  ugardanti: {
    premise: 'Ugardanti is presented here in a traditional selected recension headed Sri Mukhvaak Patshahi 10. Its six chhands carry forceful praise and bir-ras imagery directed toward Divine power and the defeat of destructive forces.',
    context: 'The BaniDB text is appended at its supplementary page 1428, while other catalogs place the work differently. Inclusion, pagination, and recension are not uniform across Dasam-related editions, so this reader avoids claiming one settled canonical range.',
    usage: 'Read the complete selected recension and retain its source note. Approach the martial language through disciplined courage and Divine justice, with room for further sampradaic and textual study.',
    sourceLine: 'Supplementary Ugardanti recension · Pagination varies by edition',
    extraSources: [DASAM_OVERVIEW],
  },
  'vaar-sri-bhagauti-ji-ki': {
    premise: 'Vaar Sri Bhagauti Ji Ki, widely called Chandi Di Vaar, is a 55-pauri Punjabi ballad in the Dasam tradition, traditionally attributed to Guru Gobind Singh Ji. Its mythic battle carries bir ras and the struggle against destructive power.',
    context: 'The opening pauri supplies the opening words of Ardaas. The composition’s Chandi narrative belongs to a martial-poetic genre and should not be flattened into plain chronicle or aggression.',
    usage: 'Read pauri by pauri with the mythic and devotional registers together. Let courage remain accountable to Divine justice and the protection of others.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Chandi di Var',
      url: 'https://eos.learnpunjabi.org/CHANDI%20DI%20VAR%20%28THE%20BALLAD%20OF%20GODDESS%20CHANDI%29.html',
      note: 'Used for the 55-pauri form, traditional attribution, martial genre, and link to Ardaas.',
    }],
  },
  'akal-ustat': {
    premise: 'Akal Ustat is a mixed-form praise composition of the Dasam tradition, traditionally attributed to Guru Gobind Singh Ji. It acclaims the Timeless One beyond sectarian labels and returns human dignity to the shared light within humankind.',
    context: 'The work moves between praise and didactic passages across Dasam Angs 11–38. The familiar Tav Prasad selections belong inside this larger composition, while Akal Ustat itself is not prescribed as daily Nitnem.',
    usage: 'Read beyond the famous excerpts and follow each metre change. Keep universal praise joined to the text’s demand for sincere conduct.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Akal Ustati',
      url: 'https://eos.learnpunjabi.org/AKAL%20USTATI%20%28IN%20PRAISE%20OF%20THE%20TIMELESS%20BEING%29.html',
      note: 'Used for the composition’s traditional attribution, mixed forms, and praise of the Timeless One.',
    }],
  },
  zafarnama: {
    premise: 'Zafarnama is Guru Gobind Singh Ji’s 111-stanza Persian verse letter to Emperor Aurangzeb, written from Dina around 1706. Its “victory” is moral: truth, justice, fidelity to one’s word, and spiritual sovereignty stand above temporary power.',
    context: 'The letter answers broken oaths and violence after Anandpur. Its teaching on resort to arms belongs to a last-resort frame after other means have failed, not to triumphalism detached from ethics.',
    usage: 'Read the Persian epistle as a complete moral argument. Keep historical claims tied to the letter’s sequence and avoid presenting a single catalog Ang as the location of the whole work.',
    sourceLine: 'Persian epistle · Traditionally included with Dasam Granth · Source pagination varies',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Zafarnamah',
      url: 'https://eos.learnpunjabi.org/ZAFARNAMAH.html',
      note: 'Used for authorship, date and place, addressee, 111-stanza form, and moral-historical setting.',
    }],
  },
  'shabad-hazare-10': {
    premise: 'Shabad Hazare Patshahi 10 is a later anthology title for ten raag-set shabads in the Dasam tradition, traditionally attributed to Guru Gobind Singh Ji. The shabads turn renunciation inward and give longing to the Creator rather than fascination with creation.',
    context: 'The collection spans Dasam Angs 709–712, but its anthology title is editorial rather than an original continuous heading. Each raag and shabad retains its own movement.',
    usage: 'Read shabad by shabad and keep the raag headings. This is a respected supplementary reading, while the Sikh Rehat Maryada does not list it among the prescribed daily Nitnem banis.',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Shabad Hazare Patshahi 10',
      url: 'https://eos.learnpunjabi.org/SHABAD%20HAJARE%20PATSHAHI%2010.html',
      note: 'Used for the ten-shabad anthology, traditional attribution, and thematic context.',
    }],
  },
  'sastra-naam-mala': {
    premise: 'Shastar Naam Mala is a long martial-devotional composition in the Dasam tradition, traditionally attributed to Guru Gobind Singh Ji. Weapon names, wordplay, and riddling catalogues become praise of righteous power under the Divine.',
    context: 'The full traditional work is far longer than the opening chapter currently returned by the exact reader record. The catalog and data extent therefore remain explicit instead of implying that Angs 717–718 exhaust the composition.',
    usage: 'Read with bir-ras discipline and genre awareness. The power praised serves justice and protection, never aggression or self-gain.',
    sourceLine: 'Shastar Naam Mala · Dasam tradition · Current exact record opens the first chapter',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Sastra Nam Mala Puran',
      url: 'https://eos.learnpunjabi.org/SASTRA%20NAM%20MALA%20PURAN.html',
      note: 'Used for the traditional scale, literary form, and martial-devotional context.',
    }],
  },
  'tav-prasad-savaiye-dinan-ki': {
    premise: 'Tav Prasad Savaiye, Dheenan Ki, is a distinct ten-Savaiyya selection from Akal Ustat. It praises Divine guardianship and dignity while carrying a different text from the Sraavag Suddh set.',
    context: 'Dheenan Ki and Sraavag Suddh share a catalog family name but are separate selections. The Sikh Rehat Maryada prescribes the Sraavag Suddh set for Nitnem, not this Dheenan Ki route.',
    usage: 'Keep the Dheenan Ki variant label in the title and source note. Read all ten Savaiyye together and compare variants only with both complete texts in view.',
    sourceLine: 'Akal Ustat selection · Dheenan Ki variant · Distinct from prescribed Sraavag Suddh set',
    extraSources: [SGPC_REHAT],
  },
  'akal-ustat-chaupai': {
    premise: 'Akal Ustat Chaupai is a selected ten-stanza chaupai passage from Akal Ustat, not a separate full-length composition. Its compact praise places protection, power, and trust in the Timeless One.',
    context: 'The source heading keeps this excerpt inside Akal Ustat and marks Patshahi 10. Treating the selection as an excerpt preserves its relation to the larger work.',
    usage: 'Read all ten stanzas and then return to the surrounding Akal Ustat passage for extended study. Keep the excerpt label visible when saving or sharing.',
    extraSources: [DASAM_OVERVIEW],
  },
  'sri-bhagauti-astotr': {
    premise: 'Sri Bhagauti Astotr is presented in the Panth Prakash recension selected by this reader. The praise text uses martial names and Divine-power imagery in a traditional composition attributed to Patshahi 10.',
    context: 'Panth Prakash and Hazur Sahib are named recensions with textual differences. Their placement and pagination are supplementary and edition-dependent, so this route identifies the selected recension without claiming a universal canonical location.',
    usage: 'Read the Panth Prakash recension complete and keep its label attached. Compare it with the Hazur Sahib recension line by line, with reverence for the traditions that preserve each form.',
    sourceLine: 'Sri Bhagauti Astotr · Panth Prakash recension · Edition-dependent placement',
  },
  'sri-bhagauti-astotr-hazur-sahib': {
    premise: 'Sri Bhagauti Astotr, Hazur Sahib, is the Hazur Sahib recension selected by this reader. Its martial praise and Divine-power imagery belong to a traditional text attributed to Patshahi 10.',
    context: 'This form differs from the Panth Prakash recension. Supplementary placement and pagination vary across editions, so the recension name carries more useful provenance than a single asserted Ang.',
    usage: 'Read the Hazur Sahib recension complete and preserve its label. Use a side-by-side comparison when studying differences from the Panth Prakash form.',
    sourceLine: 'Sri Bhagauti Astotr · Hazur Sahib recension · Edition-dependent placement',
  },
  'ath-chandi-charitar': {
    premise: 'Ath Chandi Charitar is a selected closing praise chapter from Chandi Charitar Ukti Bilas in the Dasam tradition. Martial and mythic images mark victory over destructive forces within a wider Chandi narrative.',
    context: 'The route opens the short Ath Chandi Charitar Ustat Barnanam section on Dasam Ang 119, not the whole narrative. The heading and compact form protect the excerpt from being mistaken for a major standalone composition.',
    usage: 'Read the selected chapter with the surrounding Chandi Charitar genre in mind. Keep mythic battle, bir ras, and moral struggle joined rather than literalizing one image.',
    extraSources: [DASAM_OVERVIEW],
  },
  'barah-maha-savaiyaa': {
    premise: 'Barah Maha Savaiyaa is a twelve-month Savaiyya passage in the Krishna Avtar region of the Dasam literary tradition on Angs 383–384. Seasonal images voice separation and longing through the passage’s own narrative world.',
    context: 'This is an excerpt and reader grouping rather than a major standalone composition. Its Krishna-centred voice differs from the SGGS Barah Maha compositions of Guru Nanak Sahib Ji and Guru Arjan Sahib Ji.',
    usage: 'Read the twelve-month passage as one excerpt and retain its Krishna Avtar context. Compare seasonal compositions only after their distinct source, authorial tradition, and voice are clear.',
    sourceLine: 'Krishna Avtar region · Dasam literary tradition · Twelve-month Savaiyya excerpt',
  },
  'bhai-gurdas-vaaran': {
    premise: 'Bhai Gurdas Ji Vaaran is a collection of forty Punjabi vaars associated with Bhai Gurdas Ji, the early Sikh exegete and scribe of the Adi Granth. The writings illuminate Gurmat vocabulary, Guru Nanak Sahib Ji’s mission, sangat, pangat, conduct, and early community life.',
    context: 'Sikh tradition honours these vaars as a key to understanding Gurbani, while they remain interpretive Sikh literature rather than Sri Guru Granth Sahib Ji. Exact Vaar and pauri markers keep the commentary anchored.',
    usage: 'Read one Vaar pauri by pauri and verify which edition and author label is present. Carry its insight back to Gurbani without blurring the distinction between revered exposition and Shabad-Guru.',
    sourceLine: 'Bhai Gurdas Ji Vaaran · Forty-vaars collection',
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Bhai Gurdas Ji',
      url: 'https://eos.learnpunjabi.org/GURDAS%20BHAI%20%281551-1636%29.html',
      note: 'Used for Bhai Gurdas Ji’s life, role as scribe, and interpretive writings.',
    }],
  },
  'amrit-keertan': {
    premise: 'Amrit Keertan is a curated kirtan hymnbook and index, not a single bani or continuous scripture. Each entry opens a shabad whose own writer, raag, Ang, and scripture source remain authoritative.',
    context: 'The collection supplies a book order for finding shabads used in kirtan. A section title or Amrit Keertan page never replaces the original Gurbani heading.',
    usage: 'Use the book index to discover a shabad, then read the complete source shabad. Keep both the Amrit Keertan location and original scripture metadata when saving or sharing.',
    sourceLine: 'Amrit Keertan hymnbook · Curated shabad index',
    extraSources: [{
      label: 'Amrit Keertan table of contents',
      url: 'https://amritkirtan.com/shabad-TOC.html',
      note: 'Used to describe the work as a hymnbook and ordered shabad index.',
    }],
  },
}

type VaarProfile = {
  composer: string
  pauris: number
  focus: string
  saloks: string
}

const VAAR_PROFILES: Record<string, VaarProfile> = {
  'sri-raag-ki-vaar': { composer: 'Guru Ram Das Ji', pauris: 21, focus: 'Guru, Shabad, naam, humility, and grace', saloks: 'Attached saloks include voices beyond Mahalla 4, so each internal Mahalla marker remains part of the reading.' },
  'var-majh': { composer: 'Guru Nanak Sahib Ji', pauris: 27, focus: 'naam, equality, justice, honest engaged life, and clear criticism of caste and hollow ritual', saloks: 'Its 63 attached saloks carry Mahalla 1, 2, 3, and 4 voices; the traditional tune is named in the heading.' },
  'gauri-ki-vaar-m4': { composer: 'Guru Ram Das Ji', pauris: 33, focus: 'Guru, Shabad, naam, devotion, and humility', saloks: 'The Mahalla 4 heading identifies the pauris while attached saloks retain their own Mahalla labels.' },
  'gauri-ki-vaar-m5': { composer: 'Guru Arjan Sahib Ji', pauris: 21, focus: 'the Creator, grace, naam, and release from ego and the five vices', saloks: 'Its 42 attached saloks are marked Mahalla 5, and the heading names the traditional tune of Rai Kamaldi Mojdi.' },
  'var-gujri': { composer: 'Guru Amar Das Ji', pauris: 22, focus: 'Divine wonder, the Guru, naam, ego, and grace', saloks: 'Mixed attached saloks keep their own Mahalla markers; the heading also preserves the Sikandar Ibrahim tune reference.' },
  'gujari-vaar-mahalla-5': { composer: 'Guru Arjan Sahib Ji', pauris: 21, focus: 'the Creator, grace, the Guru, naam, and overcoming ego', saloks: 'Two Mahalla 5 saloks accompany each pauri in this tightly ordered Vaar.' },
  'bihagare-ki-vaar': { composer: 'Guru Ram Das Ji', pauris: 21, focus: 'the Guru, naam, Divine generosity, and ethical reflection', saloks: 'Attached material carries mixed attribution, including a Bhai Mardana-associated salok context, so the heading cannot be applied to every line.' },
  'var-vadahans': { composer: 'Guru Ram Das Ji', pauris: 21, focus: 'naam, the Guru, impermanence, and reliance on the Divine', saloks: 'Mixed saloks accompany the pauris, and the heading preserves the Lalla Behlima tune reference.' },
  'var-sorath': { composer: 'Guru Ram Das Ji', pauris: 29, focus: 'Guru-centred devotion, humility, and praise', saloks: 'The attached saloks include Mahalla 1 and Mahalla 4 voices.' },
  'jaitsri-vaar-m5': { composer: 'Guru Arjan Sahib Ji', pauris: 20, focus: 'Divine praise and refuge, naam, humility, and worldly transience', saloks: 'The title itself says “with saloks,” making their place in the reading explicit.' },
  'var-suhi': { composer: 'Guru Amar Das Ji', pauris: 20, focus: 'Guru, Shabad, naam, inner truth, and life within Divine will', saloks: 'Mixed saloks retain their Mahalla labels and sharpen the Vaar’s contrast between truth and ego.' },
  'var-bilaval': { composer: 'Guru Ram Das Ji', pauris: 13, focus: 'the True Guru, praise, naam, and grace', saloks: 'The compact Vaar carries attached saloks from more than one Mahalla.' },
  'var-ramkali-m3': { composer: 'Guru Amar Das Ji', pauris: 21, focus: 'Guru, naam, death, impermanence, ego, and liberation through grace', saloks: 'Mixed saloks accompany the pauris, and the heading preserves the Jodha Veera Purabani tune.' },
  'var-ramkali-m5': { composer: 'Guru Arjan Sahib Ji', pauris: 22, focus: 'one Divine reality, naam, the Guru, humility, and grace', saloks: 'Attached saloks carry their own internal authorship markers.' },
  'var-maru': { composer: 'Guru Amar Das Ji', pauris: 22, focus: 'hukam, the Guru, naam, ego, and ethical conduct', saloks: 'Mixed saloks accompany the Mahalla 3 pauris.' },
  'maru-vaar-mahalla-5-dakhane': { composer: 'Guru Arjan Sahib Ji', pauris: 23, focus: 'Divine pervasiveness, humility, naam, and refuge', saloks: '“Dakhane” identifies the Dakhni or southern-form saloks and verses within this Maru sequence.' },
  'basant-ki-vaar': { composer: 'Guru Arjan Sahib Ji', pauris: 3, focus: 'spiritual spring and renewal through naam and the True Guru', saloks: 'This brief Vaar has no attached saloks, so its three pauris form the complete unit.' },
  'var-sarang': { composer: 'Guru Ram Das Ji', pauris: 36, focus: 'the Guru, naam, hukam, humility, and praise', saloks: 'Mixed attached saloks preserve their own Mahalla markers; the heading names the Rai Mahma Hasna tune.' },
  'var-mallar': { composer: 'Guru Nanak Sahib Ji', pauris: 28, focus: 'Divine sovereignty, hukam, truthful living, and a critique of ego and falsehood', saloks: 'The attached saloks include Mahalla 2 and other Guru voices; the heading preserves the Rana Kailas and Malde tune.' },
  'kanare-ki-vaar': { composer: 'Guru Ram Das Ji', pauris: 15, focus: 'Guru-centred devotion, naam, and grace', saloks: 'Mixed saloks accompany the pauris, and the heading names the Musa tune.' },
}

type RaagProfile = {
  voices: string
  focus: string
}

const RAAG_PROFILES: Record<string, RaagProfile> = {
  'raag-siri-raag-kabir': { voices: 'Kabir Ji, Trilochan Ji, Beni Ji, and Ravidas Ji', focus: 'mortality, self-knowledge, Divine unity, and remembrance' },
  'raag-gauri': { voices: 'a large and form-diverse Bhagat cluster led by Kabir Ji, followed by Namdev Ji and Ravidas Ji', focus: 'alphabetic, lunar-date, weekday, and shabad forms that cannot be reduced to one composition' },
  'raag-asa': { voices: 'Kabir Ji, Namdev Ji, Ravidas Ji, Dhanna Ji, and Sheikh Farid Ji, with an internal Mahalla 5 marker', focus: 'devotion, surrender, ethical clarity, and social or ritual critique that changes by speaker' },
  'raag-gujri': { voices: 'Kabir Ji, Namdev Ji, Ravidas Ji, Trilochan Ji, and Jaidev Ji', focus: 'distinct shabads joined by raag rather than a single author or argument' },
  'raag-sorath': { voices: 'Kabir Ji, Namdev Ji, Ravidas Ji, and Bhikhan Ji', focus: 'remembrance, humility, refuge, and the Divine presence across different voices' },
  'raag-dhanasri': { voices: 'Kabir Ji, Namdev Ji, Ravidas Ji, Trilochan Ji, Sain Ji, Pipa Ji, and Dhanna Ji', focus: 'a broad Bhagat chorus whose headings govern attribution' },
  'raag-jaitsri': { voices: 'one Ravidas Ji shabad', focus: 'human helplessness before the five impulses and a direct turn toward Divine refuge' },
  'raag-todi-bhagat': { voices: 'three Namdev Ji shabads', focus: 'direct remembrance, Divine presence, and devotion beyond argument or outward display' },
  'raag-tilang-kabir': { voices: 'Kabir Ji and Namdev Ji', focus: 'the One, inward search, and mercy expressed through a Persianate vocabulary' },
  'raag-suhi': { voices: 'Kabir Ji and Ravidas Ji', focus: 'mortality, the True Guru, devotion, and refuge' },
  'raag-bilaval': { voices: 'Kabir Ji, Namdev Ji, Ravidas Ji, and Sadhna Ji', focus: 'naam, Divine nearness, humility, and devotion across social boundaries' },
  'raag-gond': { voices: 'Kabir Ji, Namdev Ji, and Ravidas Ji', focus: 'spiritual freedom, humility, and Divine presence' },
  'raag-mali-gaura': { voices: 'one Namdev Ji Bhagat section', focus: 'devotion and reliance on the Divine' },
  'raag-maru': { voices: 'Kabir Ji, Namdev Ji, Jaidev Ji, and Ravidas Ji', focus: 'distinct Bhagat shabads held together by the Maru setting' },
  'raag-kedara': { voices: 'Kabir Ji and Ravidas Ji', focus: 'remembrance and devotion across two clearly marked voices' },
  'raag-bhairao': { voices: 'Kabir Ji, Namdev Ji, and Ravidas Ji, with a Mahalla 5 insertion at Ang 1160', focus: 'a mixed route whose internal heading must govern every attribution' },
  'raag-basant': { voices: 'Kabir Ji, Ramanand Ji, Namdev Ji, and Ravidas Ji', focus: 'renewal, remembrance, and devotion through several distinct shabads' },
  'raag-sarang': { voices: 'Kabir Ji, Namdev Ji, Parmanand Ji, and a Surdas-associated passage with a Mahalla 5 heading', focus: 'careful source reading where headings matter more than a blanket author label' },
  'raag-malaar': { voices: 'Namdev Ji and Ravidas Ji', focus: 'two Bhagat voices joined by the Malaar setting' },
  'raag-kanara': { voices: 'Namdev Ji', focus: 'a compact single-Ang Bhagat section' },
  'raag-prabhati': { voices: 'Kabir Ji, Namdev Ji, and Beni Ji', focus: 'the closing Bhagat-bani cluster before the final salok and savaiyye sections' },
}

type SavaiyeProfile = {
  subject: string
  count: number
  context: string
}

const SAVAIYE_PROFILES: Record<string, SavaiyeProfile> = {
  'savaiye-sri-mukhbaak-m5-1': { subject: 'Guru Arjan Sahib Ji’s own first Savaiyye sequence', count: 9, context: 'The Sri Mukhbaak Mahalla 5 heading identifies the Guru’s own utterance and keeps this sequence distinct from the Bhatt Bani that follows.' },
  'savaiye-sri-mukhbaak-m5-2': { subject: 'Guru Arjan Sahib Ji’s own following Savaiyye sequence', count: 11, context: 'Together with the preceding nine, these form twenty Sri Mukhbaak Savaiyye before the Bhatt compositions begin.' },
  'savaiye-mahalla-1': { subject: 'Bhatt Savaiyye in praise of Guru Nanak Sahib Ji', count: 10, context: 'The Guru named in the heading is praised, while the Bhatts are the poets; tradition chiefly associates this set with Bhatt Kalh Ji.' },
  'savaiye-mahalla-2': { subject: 'Bhatt Savaiyye in praise of Guru Angad Sahib Ji', count: 10, context: 'The heading names the Guru praised, while internal tradition assigns the poetry to Bhatt voices including Kalh Ji and Tal Ji.' },
  'savaiye-mahalla-3': { subject: 'Bhatt Savaiyye in praise of Guru Amar Das Ji', count: 22, context: 'Several Bhatts contribute to this section, acclaiming the continuity of one Divine light through the Gurus.' },
  'savaiye-mahalla-4': { subject: 'Bhatt Savaiyye in praise of Guru Ram Das Ji', count: 60, context: 'This is the largest Bhatt section and carries several named poet voices under the heading of the Guru praised.' },
  'savaiye-mahalla-5': { subject: 'Bhatt Savaiyye in praise of Guru Arjan Sahib Ji', count: 21, context: 'Several Bhatts speak in this closing praise section; Mahalla 5 names the Guru praised rather than a blanket author.' },
}

function describeRange(bani: Bani) {
  const unit = bani.scripture === 'BGV' ? 'Vaar' : bani.scripture === 'AK' ? 'page' : 'Ang'
  const plural = unit === 'Vaar' ? 'Vaaran' : unit === 'page' ? 'pages' : 'Angs'
  return bani.startAng === bani.endAng ? unit + ' ' + bani.startAng : plural + ' ' + bani.startAng + '–' + bani.endAng
}

function buildVaarResearch(bani: Bani, profile: VaarProfile): ReaderEditorialResearch {
  const usage = bani.id === 'basant-ki-vaar'
    ? 'Read its three pauris together as the complete Vaar. Keep the Basant heading visible so this brief composition remains grounded in its raag and form.'
    : 'Read one pauri with the saloks attached around it, then continue in order. Keep every Mahalla marker visible so the Vaar’s structure never erases a contributing voice.'

  return {
    premise: bani.name + ' carries ' + profile.pauris + ' pauris by ' + profile.composer + ' at ' + describeRange(bani) + '. Its sustained movement joins ' + profile.focus + '.',
    context: 'The Vaar heading identifies the pauri composer, while attached saloks can carry other Guru voices. ' + profile.saloks,
    usage,
    extraSources: [{
      label: 'Punjabi University Encyclopedia: Vaar',
      url: 'https://eos.learnpunjabi.org/VAR.html',
      note: 'Used for the SGGS Vaar form, pauri structure, and the relationship between headline authorship and attached saloks.',
    }],
  }
}

function buildRaagResearch(bani: Bani, profile: RaagProfile): ReaderEditorialResearch {
  return {
    premise: bani.name + ' gathers the Bhagat-Bani portion of its named raag at ' + describeRange(bani) + '. The route includes ' + profile.voices + ', with attention to ' + profile.focus + '.',
    context: 'This is a source grouping of distinct shabads, not the full SGGS raag section and not one composition by one author. Internal writer and heading changes carry the attribution.',
    usage: 'Begin each shabad with its heading, writer, raag, and rahao line where present. Keep enough neighbouring text to preserve the individual voice before comparing themes across the cluster.',
    extraSources: [{
      label: 'Encyclopedia of Sikhism: Bhagat Bani',
      url: 'https://www.thesikhencyclopedia.com/bhagat-bhakta-bani/',
      note: 'Used for the place of Bhagat Bani within Sri Guru Granth Sahib Ji and its many contributor voices.',
    }],
  }
}

function buildSavaiyeResearch(bani: Bani, profile: SavaiyeProfile): ReaderEditorialResearch {
  const isBhatt = bani.id.startsWith('savaiye-mahalla-')
  return {
    premise: profile.subject + ' form a ' + profile.count + '-Savaiyya sequence at ' + describeRange(bani) + '. Compact praise verse carries devotion, lineage, and recognition of the Guru’s light.',
    context: profile.context,
    usage: 'Read the complete Savaiyya sequence and keep every poet or Mahalla marker visible. ' + (isBhatt ? 'Attribute the verse to its Bhatt voice while naming the Guru whom the section praises.' : 'Keep the Sri Mukhbaak heading with the text so it is not merged into the Bhatt section.'),
    extraSources: isBhatt ? [BHATT_BANI_OVERVIEW] : undefined,
  }
}

export function getReaderEditorialResearchForBani(bani: Bani): ReaderEditorialResearch | null {
  const manual = MANUAL_RESEARCH_BY_ID[bani.id]
  if (manual) return manual

  const vaar = VAAR_PROFILES[bani.id]
  if (vaar) return buildVaarResearch(bani, vaar)

  const raag = RAAG_PROFILES[bani.id]
  if (raag) return buildRaagResearch(bani, raag)

  const savaiye = SAVAIYE_PROFILES[bani.id]
  if (savaiye) return buildSavaiyeResearch(bani, savaiye)

  return null
}

export const RESEARCHED_BANI_IDS = new Set([
  ...Object.keys(MANUAL_RESEARCH_BY_ID),
  ...Object.keys(VAAR_PROFILES),
  ...Object.keys(RAAG_PROFILES),
  ...Object.keys(SAVAIYE_PROFILES),
])
