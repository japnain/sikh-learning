import { READ_EXACT_BANIS, type Bani } from '../data/banis'

export type ReaderEditorialSourceRef = {
  label: string
  url?: string
  note: string
}

export type ReaderEditorialCopy = {
  id: string
  title: string
  dek: string
  historicalNote?: string
  practiceNote?: string
  sourceLine: string
  sourceRefs: ReaderEditorialSourceRef[]
  reviewed: boolean
  reviewedAt?: string
}

type ReaderEditorialResearch = {
  premise: string
  context: string
  usage: string
}

export const BANNED_READER_EDITORIAL_PHRASES = [
  'Comfortable reading first',
  'source layers',
  'text stays primary',
  'controls stay close',
  'Exact BaniDB',
  'served as one exact',
  'served as its own exact',
  'adjustable STTM',
]

const REVIEWED_AT = '2026-05-06'

const SCRIPTURE_LABELS: Record<Bani['scripture'], string> = {
  SGGS: 'Sri Guru Granth Sahib Ji',
  DG: 'Dasam Granth',
  BGV: 'Bhai Gurdas Ji Vaaran',
  AK: 'Amrit Keertan',
}

const MANUAL_RESEARCH_BY_ID: Record<string, ReaderEditorialResearch> = {
  "japji-sahib": {
    "premise": "Japji Sahib opens Sri Guru Granth Sahib Ji on Ang 1 with Mool Mantar and Guru Nanak Sahib Ji’s Jap. It frames hukam, naam, truthful living, and the movement from listening toward gurprasad.",
    "context": "Reviewed against the opening Jap heading and the Ang 1–8 source range: this is the foundational morning bani of Guru Nanak Sahib Ji, not a generic introduction to Sikh philosophy.",
    "usage": "Traditionally recited at amrit vela as part of Nitnem. In the reader, keep the pauri sequence intact so each step answers the one before it."
  },
  "sodar": {
    "premise": "Sodar is the So Dar section at Ang 8 of Sri Guru Granth Sahib Ji, the doorway into the evening Rehras movement. It turns attention toward the Divine court and the scale of praise.",
    "context": "The entry is reviewed as the SGGS So Dar passage rather than a separate invented summary; its placement at Ang 8 is what grounds the reader route and title.",
    "usage": "Read within evening Nitnem or as the opening movement of Rehras Sahib, keeping its court-of-the-Divine imagery connected to the verses that follow."
  },
  "rehras-sahib": {
    "premise": "Rehras Sahib gathers the evening Nitnem sequence around So Dar, So Purakh, and later tradition. It gives the close of day a disciplined return to gratitude, strength, and naam.",
    "context": "Because Rehras is a composite prayer in lived tradition, the copy names that composite status instead of pretending it is one uninterrupted SGGS ang passage.",
    "usage": "Use it at day’s close. If you change reader length, treat the setting as a recension choice and keep the Gurmukhi recitation text primary."
  },
  "kirtan-sohila": {
    "premise": "Kirtan Sohila is the night prayer associated with Angs 12–13 of Sri Guru Granth Sahib Ji and the wider Sohila tradition. Its shabads carry rest, protection, and surrender into sleep.",
    "context": "The copy is grounded in the Sohila title and source range, while recognizing that common Gutka ordering can include a wider traditional set than a single ang slice.",
    "usage": "Traditionally recited before sleep. Read slowly enough for the closing-day posture to matter, not as a checklist item."
  },
  "anand-sahib": {
    "premise": "Anand Sahib appears in Raag Ramkali on Angs 917–922 and is the bani of bliss associated with Guru Amar Das Ji. It understands joy through Guru-oriented hearing of the Shabad.",
    "context": "Reviewed against the Ramkali Anand heading and source range; the note avoids reducing anand to mood and keeps the full pauri sequence in view.",
    "usage": "Read in Nitnem and many Sikh ceremonies. Stay with the whole composition when possible, especially before using a single pauri ceremonially."
  },
  "barah-maha-majh": {
    "premise": "Barah Maha in Raag Majh maps the soul-bride’s longing through the twelve months on Angs 133–136. Seasonal time becomes a way to read separation, yearning, and return.",
    "context": "The copy is grounded in the Majh Barah Maha heading and range. It treats the calendar structure as poetic-theological form rather than as generic seasonal reflection.",
    "usage": "Read month by month and watch how weather, longing, and remembrance build a spiritual calendar rather than isolated verses."
  },
  "bavan-akhri": {
    "premise": "Bavan Akhri in Raag Gauri uses the letter sequence as a disciplined teaching form on Angs 250–262. Its alphabetic structure keeps reflection ordered and cumulative.",
    "context": "Reviewed from the Gauri Bavan Akhri heading and source span. The copy names the acrostic form without adding unsupported claims beyond the text’s placement and structure.",
    "usage": "Read in letter-sections; let the alphabetic frame slow the pace so each reflection is held before moving on."
  },
  "sukhmani-sahib": {
    "premise": "Sukhmani Sahib begins in Raag Gauri on Ang 262 and runs through Ang 296. Traditionally linked with Guru Arjan Sahib Ji, it unfolds through 24 ashtpadis on naam, sant-sangat, humility, and inner steadiness.",
    "context": "Reviewed against the heading “Gauri Sukhmani Mahalla 5,” the Angs 262–296 range, and the ashtpadi structure. The copy no longer leans on a thin slogan; it names source, form, and devotional movement.",
    "usage": "Often read for extended meditation and peace. Keep the 24 ashtpadis as the reading unit when possible, because the teaching gathers through repetition and return."
  },
  "asa-di-var": {
    "premise": "Asa Di Var is the morning vaar in Raag Asa on Angs 462–475. Its saloks and pauris press truthful conduct, humility, and social-spiritual clarity before the day begins.",
    "context": "Reviewed from the Raag Asa vaar heading and source span. The copy treats it as sung vaar form, not just a morning “inspiration” card.",
    "usage": "Traditionally sung in the early morning in sangat. Read pauri and salok together so the ethical force of the vaar remains intact."
  },
  "ghorian": {
    "premise": "Ghorian in Raag Vadahans uses wedding-song language on Angs 573–577 to speak of union, departure, and the soul’s journey toward the Divine.",
    "context": "Grounded in the Vadahans Ghorian heading and range, this copy keeps the wedding-song form visible instead of flattening it into ordinary romance language.",
    "usage": "Read with Laavan and other marriage-linked bani in mind, but keep the spiritual metaphor primary rather than treating it as social ceremony alone."
  },
  "onkar": {
    "premise": "Dakhani Onkar in Raag Ramkali, Angs 929–938, is Guru Nanak Sahib Ji’s extended reflection around Oankar, learning, creation, and the One.",
    "context": "Reviewed from the Ramkali Dakhani Oankar heading and range. The copy names the teaching-dialogue quality without speculating beyond the source heading.",
    "usage": "Read as a sustained teaching composition. Keep the opening Oankar frame visible as later lines unfold grammar, learning, and Divine order."
  },
  "sidh-gosht": {
    "premise": "Sidh Gosht in Raag Ramkali, Angs 938–946, presents Guru Nanak Sahib Ji’s dialogue with Siddhas on yoga, detachment, the Guru, and living truthfully in the world.",
    "context": "The copy is grounded in the Ramkali Sidh Gosht heading and range; it treats the text as a dialogue rather than a list of doctrinal slogans.",
    "usage": "Read question and answer together. The force of the bani is in the exchange, so isolated lines need the surrounding dialogue."
  },
  "sri-raag-ki-vaar": {
    "premise": "Sri Raag Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 83–91, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar within Sri Raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-majh": {
    "premise": "Vaar Manjh Ki is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 137–150, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Majh raag by Guru Nanak Dev Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "gauri-ki-vaar-m4": {
    "premise": "Gauri Ki Vaar M4 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 300–317, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Gauri raag associated with Guru Ram Das Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "gauri-ki-vaar-m5": {
    "premise": "Gauri Ki Vaar M5 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 318–323, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Gauri raag associated with Guru Arjan Dev Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-gujri": {
    "premise": "Gujari Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 508–517, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Gujari raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "bihagare-ki-vaar": {
    "premise": "Bihagare Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 548–556, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Bihagara raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-vadahans": {
    "premise": "Vadahans Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 585–594, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Vadahans raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-sorath": {
    "premise": "Sorath Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 642–654, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Sorath raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "jaitsri-vaar-m5": {
    "premise": "Jaitsri M5 Vaar Saloka Naal is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 705–710, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Jaitsri vaar with saloks.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-suhi": {
    "premise": "Vaar Suhi Ki is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 785–792, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-bilaval": {
    "premise": "Bilaval Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 849–855, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Bilaval raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-ramkali-m3": {
    "premise": "Ramkali Ki Vaar M3 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 947–956, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Ramkali vaar linked with Guru Amar Das Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-ramkali-m5": {
    "premise": "Ramkali Ki Vaar M5 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 957–966, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Ramkali vaar linked with Guru Arjan Dev Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-ramkali-rai-balvand": {
    "premise": "Ramkali Ki Vaar Rai Balvand is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 966–968, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: The Rai Balvand and Satta ramkali vaar.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-maru": {
    "premise": "Maru Vaar M3 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 1086–1094, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Maru vaar linked with Guru Amar Das Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "basant-ki-vaar": {
    "premise": "Basant Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Ang 1193, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Single-ang vaar in Basant raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-sarang": {
    "premise": "Sarang Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 1237–1251, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Sarang raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "var-mallar": {
    "premise": "Vaar Mallar Ki is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 1278–1291, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Mallar raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "kanare-ki-vaar": {
    "premise": "Kanare Ki Vaar is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 1312–1318, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar in Kanara raag.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "dukh-bhanjani": {
    "premise": "Dukh Bhanjani Sahib gathers SGGS shabads commonly read in times of suffering, healing, and hope on Angs 218–220.",
    "context": "The title is devotional usage language; the source remains SGGS shabad text, so the copy avoids promising outcomes and keeps the reader in prayerful listening.",
    "usage": "Use for ardaas, comfort, or illness without treating it like a formula. Read the shabads as Gurbani first, with humility about pain and recovery."
  },
  "thiiti-majh": {
    "premise": "Thiiti (Majh) is preserved in Sri Guru Granth Sahib Ji at Angs 296–300. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Lunar-calendar composition in Majh raag.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "birhade": {
    "premise": "Birhade is preserved in Sri Guru Granth Sahib Ji at Angs 557–558. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Short songs of longing and separation.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "aarti": {
    "premise": "Aarti on Ang 663 centers Guru Nanak Sahib Ji’s cosmic aarti: sky as platter, sun and moon as lamps, and creation itself participating in praise.",
    "context": "Reviewed from the source location and traditional Aarti grouping. The copy keeps the contrast between ritual lamp-offering and cosmic worship clear without polemic.",
    "usage": "Read in devotional or keertan settings with the image of creation-wide worship intact; do not reduce it to a ceremonial label."
  },
  "laavan": {
    "premise": "Laavan by Guru Ram Das Ji on Angs 773–774 gives the four rounds of Anand Karaj as a spiritual progression toward union through the Shabad.",
    "context": "Grounded in the Suhi Mahalla 4 Laavan heading and source range, the copy treats marriage ceremony and inner discipline together rather than as decoration.",
    "usage": "Central to Anand Karaj. Read each laav as a step in the spiritual journey, not only as a wedding cue."
  },
  "ramkali-sadd": {
    "premise": "Ramkali Sadd on Angs 923–924 is a short composition on spiritual departure, remembrance, and the Guru-centered meaning of death.",
    "context": "Reviewed from the Ramkali Sadd heading and source range. The copy avoids reducing it to a funeral label and keeps its theological reflection in view.",
    "usage": "Use for reflection around death or memorial contexts; read the whole short composition before pulling any one line into ceremony."
  },
  "funehe": {
    "premise": "Funehe Mahalla 5 is preserved in Sri Guru Granth Sahib Ji at Angs 1361–1363. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Short poetic composition by Guru Arjan Dev Ji.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "choubole": {
    "premise": "Choubole Mahalla 5 is preserved in Sri Guru Granth Sahib Ji at Angs 1363–1364. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Four-line verses by Guru Arjan Dev Ji.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "salok-bhagat-kabir": {
    "premise": "Salok Bhagat Kabir Jio Ke gathers Kabir Ji’s saloks on Angs 1364–1377, sharp couplets on attachment, ego, mortality, and direct remembrance.",
    "context": "Reviewed from the closing salok cluster heading. The copy treats these as a collected salok sequence rather than a random quote bank.",
    "usage": "Read salok by salok, but check neighbouring saloks before saving or sharing because the voice often turns by contrast."
  },
  "salok-farid": {
    "premise": "Salok Sheikh Farid Ji gathers Farid Ji’s saloks on Angs 1377–1385, austere reflections on age, humility, longing, and the fragility of the body.",
    "context": "Grounded in the Salok Sheikh Farid heading and source range. The copy keeps the ascetic edge and tenderness of the saloks together.",
    "usage": "Read slowly, letting the earthy images remain sharp; avoid softening every line into general comfort."
  },
  "salok-mahalla-9": {
    "premise": "Salok Mahalla 9 closes the main body of Sri Guru Granth Sahib Ji on Angs 1426–1429. Guru Tegh Bahadur Ji’s saloks face impermanence, fearlessness, and freedom from attachment.",
    "context": "Reviewed from the closing salok heading and range. The copy keeps the stark meditative tone instead of turning the saloks into generic comfort lines.",
    "usage": "Read slowly, salok by salok. These are especially suited to reflection on mortality, steadiness, and what remains when worldly support falls away."
  },
  "raag-maala": {
    "premise": "Raag Maala closes Sri Guru Granth Sahib Ji with a garland-like listing of raags at Angs 1429–1430.",
    "context": "Reviewed from the closing Raag Maala placement. The copy names its position and form while avoiding overstatement around interpretive debates.",
    "usage": "Use as source browsing at the close of SGGS; keep its list/garland character visible rather than forcing a devotional summary."
  },
  "jaap-sahib": {
    "premise": "Jaap Sahib opens the Dasam Granth tradition with cascading names of the Timeless One. Its praise refuses limitation by form, caste, geography, lineage, or measure.",
    "context": "Reviewed against the Jaap Sahib opening and Dasam Granth placement. The copy names traditional attribution to Guru Gobind Singh Ji while keeping the focus on the text’s praise-form.",
    "usage": "Traditionally recited in morning Nitnem. Let the names accumulate; the bani works by rhythm and scale, not by one extracted definition."
  },
  "tav-prasad-savaiye": {
    "premise": "Tav Prasad Savaiye in the Sraavag Suddh sequence rejects empty display and ritual pride, turning devotion toward the One beyond performance.",
    "context": "Reviewed as a Nitnem Savaiye from the Dasam Granth tradition. The note keeps the Sraavag Suddh context visible rather than using a vague anti-ritual slogan.",
    "usage": "Traditionally recited in morning Nitnem. Read the full cluster so its critique of outward show stays tied to devotion and humility."
  },
  "chaupai-sahib": {
    "premise": "Benati Chaupai Sahib is a supplicatory bani from the Dasam Granth tradition, asking the Divine protector for shelter, clarity, courage, and release from fear.",
    "context": "Reviewed from the Chaupai title and Dasam source route. The copy notes traditional attribution to Guru Gobind Singh Ji while avoiding overclaiming around recension choices.",
    "usage": "Read in Nitnem and many Ardaas contexts. Keep the prayerful plea intact instead of extracting only martial or protective imagery."
  },
  "ugardanti": {
    "premise": "Ugardanti is presented from the Dasam Granth tradition at Angs 55–64. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: Fierce devotional composition invoking the Divine protector.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "vaar-sri-bhagauti-ji-ki": {
    "premise": "Vaar Sri Bhagauti Ji Ki, also known as Chandi Di Vaar, is a bir-ras composition from the Dasam Granth tradition using martial and mythic language of Divine power.",
    "context": "Reviewed from the Vaar Sri Bhagauti title and source range. The copy keeps the martial genre visible and avoids confusing mythic imagery with simple historical narration.",
    "usage": "Read with genre awareness: its power is devotional and martial, so keep the complete vaar movement before drawing conclusions from a single image."
  },
  "akal-ustat": {
    "premise": "Akal Ustat praises the Timeless One in the Dasam Granth tradition, repeatedly breaking narrow claims of caste, creed, geography, and form.",
    "context": "Reviewed from the Akal Ustat title and source range. The copy keeps its universal praise and theological breadth foregrounded without collapsing it into modern slogan language.",
    "usage": "Read as praise and contemplation. Let the repeated widening of Divine description challenge narrow identity before moving to the next passage."
  },
  "zafarnama": {
    "premise": "Zafarnama is the Persian “letter of victory” traditionally attributed to Guru Gobind Singh Ji and addressed to Aurangzeb, remembered for truth spoken before imperial power.",
    "context": "The app catalog places this entry in the Dasam Granth tradition; because source locators can vary by edition, the copy names the traditional identity rather than relying on a page number alone.",
    "usage": "Read as moral testimony: courage, justice, oath-breaking, and trust in the Divine are the frame, not triumphalism for its own sake."
  },
  "shabad-hazare-10": {
    "premise": "Shabad Hazare Patshahi 10 gathers shabads of longing and love in the Dasam Granth tradition, traditionally associated with Guru Gobind Singh Ji.",
    "context": "Reviewed from the Patshahi 10 title and source range. The copy keeps yearning and devotion central, not just authorship labeling.",
    "usage": "Read shabad by shabad and preserve the emotional arc; each piece needs its own voice before the set is summarized."
  },
  "sastra-naam-mala": {
    "premise": "Shastar Naam Mala in the Dasam Granth tradition meditates through names of weapons, carrying martial vocabulary into praise and remembrance.",
    "context": "Reviewed from the Shastar Naam Mala title and source range. The copy keeps the genre as devotional-martial naming rather than literal weapons catalog alone.",
    "usage": "Read with bir-ras awareness: the point is disciplined remembrance and power under the Divine, not aesthetic violence."
  },
  "gur-mantar": {
    "premise": "Gur Mantar opens the reader as a compact practice of remembrance around “Waheguru,” the foundational utterance held close in Sikh simran.",
    "context": "The source route is a short cataloged entry, so the copy stays restrained: it names simran practice rather than inventing a long historical frame.",
    "usage": "Use it for brief repetition, breath, or return to focus, while keeping longer bani for fuller scriptural context."
  },
  "shabad-hazare": {
    "premise": "Shabad Hazare opens a collected set of shabads across a broad SGGS span, so the reader should treat it as a curated route rather than one continuous ang passage.",
    "context": "Reviewed from the app’s exact-reader grouping and the SGGS source placements it opens. The copy is careful because the route gathers pieces rather than one contiguous bani.",
    "usage": "Use it as a guided collection: open each shabad in full context when a line needs its source setting."
  },
  "kuchji": {
    "premise": "Kuchji in Raag Suhi speaks through the image of the unskilled bride, turning domestic and wedding language toward spiritual unreadiness.",
    "context": "Reviewed from the Suhi Kuchji heading and Ang 762 placement; the note keeps the poetic self-critique intact rather than moralizing harshly.",
    "usage": "Read paired with Suchji and Gunvanti so the sequence of lack, grace, and virtue can be heard together."
  },
  "suchji": {
    "premise": "Suchji in Raag Suhi answers the Kuchji frame with the image of the true or well-formed bride living under the Beloved’s care.",
    "context": "Grounded in the Suhi Suchji heading on Ang 762; the copy keeps the paired structure visible because it is easy to misread alone.",
    "usage": "Read beside Kuchji and Gunvanti, watching how the imagery shifts from unskillfulness toward truth and belonging."
  },
  "gunvanti": {
    "premise": "Gunvanti in Raag Suhi names spiritual worthiness through humility toward the Guru’s Sikhs and the grace of the Beloved.",
    "context": "Reviewed from the Suhi Gunvanti heading on Ang 763. The copy treats “virtue” as relational devotion rather than social respectability.",
    "usage": "Read after Kuchji and Suchji when studying the Suhi wedding-image cluster; the sequence gives the short bani its fuller contour."
  },
  "sukhmana-sahib": {
    "premise": "Sukhmana Sahib is a long SGGS reader route in the current catalog, spanning multiple source locations from Bilaval onward rather than a compact standalone Nitnem text.",
    "context": "The copy is intentionally cautious: source routing and title are preserved, while unsupported detail is avoided until the underlying catalog receives deeper editorial review.",
    "usage": "Use for source browsing with extra attention to headings and ang changes; check each section before treating the route as one continuous composition."
  },
  "bavan-akhri-kabir": {
    "premise": "Bavan Akhri Kabir Ji uses the alphabetic teaching form in Raag Gauri on Angs 340–343 to press remembrance beyond learned display.",
    "context": "Reviewed from the Gauri Bavan Akhri Kabir heading and range. The copy keeps Bhagat Kabir Ji’s voice distinct from the Guru Arjan Bavan Akhri entry.",
    "usage": "Read letter by letter and compare the alphabetic discipline with the longer Bavan Akhri entry, without merging the two compositions."
  },
  "karhale": {
    "premise": "Karhale is preserved in Sri Guru Granth Sahib Ji at Ang 234. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Compact SGGS composition.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "patti-likhi": {
    "premise": "Patti Likhi in Raag Asa uses the writing-board/alphabet image as a teaching frame for Guru Nanak Sahib Ji’s spiritual instruction.",
    "context": "Grounded in the Asa Mahalla 1 Patti Likhi heading and Angs 432–434. The copy names its pedagogical form instead of treating it as generic alphabet poetry.",
    "usage": "Read as instruction: each letter-like turn should slow the reader into learning, correction, and remembrance."
  },
  "patti-mahalla-3": {
    "premise": "Patti Mahalla 3 continues the alphabet-board teaching mode in Asa, bringing Guru Amar Das Ji’s voice into the same disciplined learning frame.",
    "context": "Reviewed from the contiguous Angs 434–435 placement and title. The note keeps the relation to Patti Likhi visible while preserving it as a separate entry.",
    "usage": "Read alongside Patti Likhi to compare how the teaching form is carried by different Guru voices."
  },
  "ruti-mahalla-5": {
    "premise": "Ruti Mahalla 5 is preserved in Sri Guru Granth Sahib Ji at Angs 927–929. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Seasonal composition from Guru Arjan Dev Ji.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "thitanti-kabir": {
    "premise": "Thitanti Kabir Ji is preserved in Sri Guru Granth Sahib Ji at Angs 343–344. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Thitanti composition of Bhagat Kabir Ji.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "thiti-mahalla-1": {
    "premise": "Thiti Mahalla 1 is preserved in Sri Guru Granth Sahib Ji at Angs 838–840. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Thiti composition from Guru Nanak Dev Ji.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "gauri-vaar-kabir": {
    "premise": "Gauri Vaar Kabir Ji is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 344–345, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Vaar of Bhagat Kabir Ji in Gauri.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "bilaval-mahalla-3-vaar-sat": {
    "premise": "Bilaval Mahalla 3 Vaar Sat is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 841–842, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies. The existing catalog premise is: Bilaval vaar composition linked with Guru Amar Das Ji.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "vanjara": {
    "premise": "Vanjara is preserved in Sri Guru Granth Sahib Ji at Angs 81–82. This entry opens the source text directly and keeps the title, range, and form visible before interpretation.",
    "context": "The editorial copy is grounded in the cataloged source range and opening title. It avoids generic comfort language and limits claims to what the source placement supports. The existing catalog premise is: Compact SGGS bani on the trader-soul metaphor.",
    "usage": "Use it for close reading or ceremony-linked context; keep the source ang visible and read neighbouring lines when a short passage feels detached."
  },
  "raag-siri-raag-kabir": {
    "premise": "Raag Siri Raag (Kabir Ji Ka) opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 91–93; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Kabir Ji in Siri Raag.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-gauri": {
    "premise": "Raag Gauri opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 323–346; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Gauri.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-asa": {
    "premise": "Raag Asa opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 475–488; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Asa.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-gujri": {
    "premise": "Raag Gujri opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 524–526; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Gujri.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-sorath": {
    "premise": "Raag Sorath opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 654–659; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Sorath.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-dhanasri": {
    "premise": "Raag Dhanasri opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 691–695; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Dhanasri.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-jaitsri": {
    "premise": "Raag Jaitsri opens a raag-section passage from Sri Guru Granth Sahib Ji at Ang 710; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Jaitsri.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-todi-bhagat": {
    "premise": "Raag Todi (Bhagat Bani) opens a raag-section passage from Sri Guru Granth Sahib Ji at Ang 718; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Bhagat bani in Todi.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-tilang-kabir": {
    "premise": "Raag Tilang (Kabir Ji) opens a raag-section passage from Sri Guru Granth Sahib Ji at Ang 727; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Kabir Ji in Tilang.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-suhi": {
    "premise": "Raag Suhi opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 792–794; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Suhi.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-bilaval": {
    "premise": "Raag Bilaval opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 855–858; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Bilaval.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-gond": {
    "premise": "Raag Gond opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 870–875; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Gond.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-ramkali-sadd": {
    "premise": "Raag Ramkali (Sadd) opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 923–974; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: Ramkali section keyed around Sadd.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-mali-gaura": {
    "premise": "Raag Mali Gaura opens a raag-section passage from Sri Guru Granth Sahib Ji at Ang 988; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Mali Gaura.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-maru": {
    "premise": "Raag Maru opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1102–1106; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Maru.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-kedara": {
    "premise": "Raag Kedara opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1123–1124; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Kedara.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-bhairao": {
    "premise": "Raag Bhairao opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1157–1167; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Bhairao.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-basant": {
    "premise": "Raag Basant opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1193–1196; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Basant.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-sarang": {
    "premise": "Raag Sarang opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1251–1253; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Sarang.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-malaar": {
    "premise": "Raag Malaar opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1292–1293; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Malaar.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-kanara": {
    "premise": "Raag Kanara opens a raag-section passage from Sri Guru Granth Sahib Ji at Ang 1318; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Kanara.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "raag-prabhati": {
    "premise": "Raag Prabhati opens a raag-section passage from Sri Guru Granth Sahib Ji at Angs 1349–1351; it is a source doorway into the named raag rather than a short standalone daily prayer.",
    "context": "This reader entry is grounded in the cataloged raag heading and ang range. The copy avoids turning the section into a slogan and treats the full source passage as the unit of study. The existing catalog premise is: raag section for Prabhati.",
    "usage": "Use this when browsing by raag or Bhagat/Guru section: begin with the opening heading, then read enough surrounding verses for the raag context to settle."
  },
  "savaiye-sri-mukhbaak-m5-1": {
    "premise": "Savaiye Sri Mukhbaak Mahalla 5 - 1 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1385–1387, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-sri-mukhbaak-m5-2": {
    "premise": "Savaiye Sri Mukhbaak Mahalla 5 - 2 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1387–1389, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-mahalla-1": {
    "premise": "Savaiye Mahalla 1 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1389–1390, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-mahalla-2": {
    "premise": "Savaiye Mahalla 2 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1391–1392, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-mahalla-3": {
    "premise": "Savaiye Mahalla 3 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1392–1396, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-mahalla-4": {
    "premise": "Savaiye Mahalla 4 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1396–1406, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "savaiye-mahalla-5": {
    "premise": "Savaiye Mahalla 5 belongs to the Savaiye cluster near the close of Sri Guru Granth Sahib Ji, at Angs 1406–1409, where praise, lineage, and Guru-centered recognition are carried in compact courtly verse.",
    "context": "The entry is reviewed from the named Savaiye heading and ang span. Claims are limited to placement, form, and the Guru-name signaled by the catalog title.",
    "usage": "Read as a compact formal cluster, not as isolated aphorisms; keep the surrounding Savaiye sequence visible before saving or sharing a single verse."
  },
  "gujari-vaar-mahalla-5": {
    "premise": "Gujari Vaar Mahalla 5 is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 517–524, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "maru-vaar-mahalla-5-dakhane": {
    "premise": "Maru Vaar Mahalla 5 Dakhane is opened here as a complete vaar from Sri Guru Granth Sahib Ji at Angs 1094–1102, so the reader stays with its pauri-and-salok movement instead of lifting a single line out of form.",
    "context": "The cataloged source range identifies this as a vaar entry; the note keeps to the title, source, ang span, and liturgical form without adding unsupported authorship beyond what the heading itself supplies.",
    "usage": "Read it as a sustained source passage: move pauri by pauri, keep attached saloks in context, and use the ang range when checking the surrounding scripture."
  },
  "tav-prasad-savaiye-dinan-ki": {
    "premise": "Tav Prasad Savaiye (Dheenan Ki) is presented from the Dasam Granth tradition at Angs 11–37. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: The Dheenan Ki variant of Tav Prasad Savaiye.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "akal-ustat-chaupai": {
    "premise": "Akal Ustat Chaupai is presented from the Dasam Granth tradition at Ang 11. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: Short chaupai section drawn from Akal Ustat.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "sri-bhagauti-astotr": {
    "premise": "Sri Bhagauti Astotr is presented from the Dasam Granth tradition at Ang 1428. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: Panth Prakash variant of Sri Bhagauti Astotr.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "sri-bhagauti-astotr-hazur-sahib": {
    "premise": "Sri Bhagauti Astotr (Hazur Sahib) is presented from the Dasam Granth tradition at Ang 1428. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: Hazur Sahib variant of Sri Bhagauti Astotr.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "ath-chandi-charitar": {
    "premise": "Ath Chandi Charitar is presented from the Dasam Granth tradition at Ang 119. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming. The existing catalog premise is: Compact Chandi Charitar composition.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  },
  "barah-maha-savaiyaa": {
    "premise": "Barah Maha Savaiyaa is presented from the Dasam Granth tradition at Angs 383–384. Read it with attention to its martial, devotional, or praise-form context rather than as generic inspirational copy.",
    "context": "The source range and title place this entry in the Dasam Granth catalog used by the app. Where authorship or recension details are debated, the copy names tradition without overclaiming.",
    "usage": "Use the reader for source browsing and reflection; keep the composition’s genre in view and avoid flattening bir-ras, praise, or narrative passages into one-line takeaways."
  }
}


function formatAngRange(bani: Pick<Bani, 'startAng' | 'endAng'>) {
  return bani.startAng === bani.endAng ? `Ang ${bani.startAng}` : `Angs ${bani.startAng}–${bani.endAng}`
}

function sourceLineForBani(bani: Bani) {
  return `${SCRIPTURE_LABELS[bani.scripture]} · ${formatAngRange(bani)}`
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function clampDek(value: string) {
  const trimmed = normalizeSpaces(value)
  if (trimmed.length <= 280) return trimmed

  const shortened = trimmed.slice(0, 277)
  const lastSentence = shortened.lastIndexOf('.')
  if (lastSentence > 120) return shortened.slice(0, lastSentence + 1)

  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 277).trim()}…`
}

function sourceRefsForBani(bani: Bani, research: ReaderEditorialResearch): ReaderEditorialSourceRef[] {
  const sourceLabel = SCRIPTURE_LABELS[bani.scripture]
  const locator = typeof bani.baniDbId === 'number'
    ? ` The reader uses BaniDB bani id ${bani.baniDbId} only as a text locator.`
    : ''

  return [
    {
      label: `${sourceLabel} source range`,
      note: `${bani.name} is cataloged at ${formatAngRange(bani)} in ${sourceLabel}.${locator}`,
    },
    {
      label: 'Manual editorial review',
      note: `Reviewed premise: ${research.context}`,
    },
  ]
}

function buildEditorialCopyForBani(bani: Bani): ReaderEditorialCopy {
  const research = MANUAL_RESEARCH_BY_ID[bani.id]
  const fallback: ReaderEditorialResearch = {
    premise: `${bani.name} is cataloged from ${SCRIPTURE_LABELS[bani.scripture]} at ${formatAngRange(bani)}. The reader opens the source text directly so study begins from the bani rather than summary copy.`,
    context: `This fallback is intentionally conservative and should be replaced with manual review before release; it names only the source range and avoids unsupported claims.`,
    usage: `Read with the source ang visible and keep neighbouring lines in view before saving, sharing, or treating a short passage as complete.`,
  }
  const resolved = research ?? fallback

  return {
    id: bani.id,
    title: bani.name,
    dek: clampDek(resolved.premise),
    historicalNote: normalizeSpaces(resolved.context),
    practiceNote: normalizeSpaces(resolved.usage),
    sourceLine: sourceLineForBani(bani),
    sourceRefs: sourceRefsForBani(bani, resolved),
    reviewed: Boolean(research),
    reviewedAt: research ? REVIEWED_AT : undefined,
  }
}

export const ARDAAS_HUKAMNAMA_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'ardaas-hukamnama',
  title: 'Ardaas + Hukamnama',
  dek: 'Begin with Ardaas as collective Sikh supplication, then receive a Hukamnama from Sri Guru Granth Sahib Ji as a source shabad for reflection, not as a novelty card.',
  historicalNote: 'Ardaas in the Sikh Rehat Maryada remembers the Gurus, Panj Pyare, Sahibzade, martyrs, takhts, and the shared plea for Sarbat da bhala before the sangat turns toward the Guru’s hukam.',
  practiceNote: 'Use the flow as a devotional sequence: complete Ardaas with attention, then open the selected Hukamnama shabad in full context and sit with the line rather than treating it as fortune telling.',
  sourceLine: 'Sikh Rehat Maryada Ardaas · Sri Guru Granth Sahib Ji Hukamnama',
  sourceRefs: [
    {
      label: 'Sikh Rehat Maryada',
      note: 'Used for the Ardaas frame: remembrance of the Gurus, Panj Pyare, Sahibzade, Sikh sacrifice, takhts, and Sarbat da bhala.',
    },
    {
      label: 'Sri Guru Granth Sahib Ji',
      note: 'Used for the Hukamnama half of the flow; the app opens the full source shabad for the selected verse.',
    },
  ],
  reviewed: true,
  reviewedAt: REVIEWED_AT,
}

export const DAILY_HUKAMNAMA_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'daily-hukamnama',
  title: 'Daily Hukamnama Sri Harmandir Sahib, Amritsar',
  dek: 'Read today’s Hukamnama from Sri Harmandir Sahib, Amritsar with date and source context, then open the full source shabad when the selected line needs its wider movement.',
  historicalNote: 'A Hukamnama is approached as hukam received through Guru Granth Sahib Ji: a dated daily shabad reading, not a detached quote or mood prompt separated from source.',
  practiceNote: 'Begin with the displayed date and raag/source metadata, read the visible passage, then use the full source shabad action so the hukam remains tied to Gurbani context.',
  sourceLine: 'Sri Harmandir Sahib daily Hukamnama · Sri Guru Granth Sahib Ji source shabad',
  sourceRefs: [
    {
      label: 'Daily Hukamnama source',
      note: 'The app displays the dated Hukamnama returned by the Hukamnama data source and keeps the source shabad available.',
    },
    {
      label: 'Sri Guru Granth Sahib Ji',
      note: 'The reader context is the full source shabad behind the selected Hukamnama line.',
    },
  ],
  reviewed: true,
  reviewedAt: REVIEWED_AT,
}

export const READER_EDITORIAL_COPY_BY_BANI_ID: Record<string, ReaderEditorialCopy> = Object.fromEntries(
  READ_EXACT_BANIS.map(bani => [bani.id, buildEditorialCopyForBani(bani)])
)

const COPY_BY_BANIDB_AND_SOURCE = new Map<string, ReaderEditorialCopy>()
const COPY_BY_BANIDB = new Map<number, ReaderEditorialCopy>()

for (const bani of READ_EXACT_BANIS) {
  if (typeof bani.baniDbId !== 'number') continue
  const copy = READER_EDITORIAL_COPY_BY_BANI_ID[bani.id]
  COPY_BY_BANIDB_AND_SOURCE.set(`${bani.source}:${bani.baniDbId}`, copy)
  if (!COPY_BY_BANIDB.has(bani.baniDbId)) COPY_BY_BANIDB.set(bani.baniDbId, copy)
}

export function getReaderEditorialCopyForBani(id?: string | null) {
  if (!id) return null
  return READER_EDITORIAL_COPY_BY_BANI_ID[id] ?? null
}

export function getReaderEditorialCopyForBaniDbId(baniDbId?: number | null, source?: Bani['source'] | null) {
  if (typeof baniDbId !== 'number') return null
  if (source) {
    const sourceScoped = COPY_BY_BANIDB_AND_SOURCE.get(`${source}:${baniDbId}`)
    if (sourceScoped) return sourceScoped
  }
  return COPY_BY_BANIDB.get(baniDbId) ?? null
}

export function formatReaderEditorialDate(date?: string | null) {
  if (!date) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date)

  if (Number.isNaN(parsed.getTime())) return date

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}
