import type { BaniProfileSectionSpec, BaniSectionLabels } from '../../../src/content/baniSections/profileTypes'

/** Offline, reviewed anchors only. Never import this generator input into the reader.
 * Evidence: docs/qa/bani-{variant,other}-structure-research-20261031/20261101.md.
 * IDs are bani-local and membership is selected from the captured normalized version.
 */
const label = (en: string, pa: string, hi: string): BaniSectionLabels => ({ en, pa, hi })
const named = (startVerseId: number, kind: string, title?: BaniSectionLabels, number?: number, excerptVerseId?: number): BaniProfileSectionSpec => ({
  id: `verse-${startVerseId}`, kind, startVerseId,
  ...(number === undefined ? {} : { number }),
  ...(title ? { label: title } : {}),
  ...(excerptVerseId === undefined ? {} : { excerptVerseId }),
})
const forms = {
  chaupai: label('Chaupai', 'ਚੌਪਈ', 'चौपई'),
  dohra: label('Dohra', 'ਦੋਹਰਾ', 'दोहरा'),
  aril: label('Aril', 'ਅੜਿਲ', 'अड़िल'),
  soratha: label('Soratha', 'ਸੋਰਠਾ', 'सोरठा'),
  kabitt: label('Kabitt', 'ਕਬਿੱਤ', 'कबित्त'),
  excerpt: label('Excerpt', 'ਅੰਸ਼', 'अंश'),
  opening: label('Opening', 'ਆਰੰਭ', 'आरंभ'),
} as const
const form = (id: number, key: keyof typeof forms, number?: number, excerpt?: number) => named(id, key,
  number === undefined ? forms[key] : label(`${forms[key].en} ${number}`, `${forms[key].pa} ${number}`, `${forms[key].hi} ${number}`), number, excerpt)
const range = (id: number, en: string, pa: string, hi: string, numbers: string, excerpt?: number) => named(id, 'chhand', label(`${en} · ${numbers}`, `${pa} · ${numbers}`, `${hi} · ${numbers}`), undefined, excerpt)
const stanzaSeries = (first: number, count: number, stride: number, kind: string, firstNumber = 1) =>
  Array.from({ length: count }, (_, i) => named(first + i * stride, kind, undefined, firstNumber + i))

const jaap = [
  range(508, 'Chhapai', 'ਛਪੈ', 'छप्पय', '1'),
  range(515, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '2–28'),
  range(624, 'Chachri', 'ਚਾਚਰੀ', 'चाचरी', '29–43'),
  range(685, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '44–61'),
  range(742, 'Chachri', 'ਚਾਚਰੀ', 'चाचरी', '62–63', 744), // includes Tera Jor invocation
  range(752, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '64–73'),
  range(792, 'Charpat', 'ਚਰਪਟ', 'चरपट', '74–78'),
  range(813, 'Rual', 'ਰੂਆਲ', 'रूआल', '79–86'),
  range(846, 'Madhubhar', 'ਮਧੁਭਾਰ', 'मधुभार', '87–93'),
  range(875, 'Chachri', 'ਚਾਚਰੀ', 'चाचरी', '94–95'),
  range(884, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '96–98'),
  range(897, 'Chachri', 'ਚਾਚਰੀ', 'चाचरी', '99–102'),
  range(914, 'Bhagvati', 'ਭਗਵਤੀ', 'भगवती', '103–132'),
  range(1035, 'Chachri', 'ਚਾਚਰੀ', 'चाचरी', '133–141'),
  range(1072, 'Charpat', 'ਚਰਪਟ', 'चरपट', '142–144'),
  range(1085, 'Rasaval', 'ਰਸਾਵਲ', 'रसावल', '145–149'),
  range(1106, 'Bhagvati', 'ਭਗਵਤੀ', 'भगवती', '150–160'),
  range(1151, 'Madhubhar', 'ਮਧੁਭਾਰ', 'मधुभार', '161–170'),
  range(1192, 'Haribolmana', 'ਹਰਿਬੋਲਮਨਾ', 'हरिबोलमना', '171–184'),
  range(1249, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '185–188'),
  range(1266, 'Ek Achhari', 'ਏਕ ਅਛਰੀ', 'एक अछरी', '189–196'),
  range(1299, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '197–199'),
]

const chaupai = [
  form(1581, 'dohra', 366), form(1584, 'dohra', 367),
  ...Array.from({ length: 9 }, (_, i) => form(i === 0 ? 1586 : 1587 + i * 4, 'chaupai', 368 + i)),
  ...Array.from({ length: 27 }, (_, i) => form(i === 0 ? 1625 : 1627 + i * 4, 'chaupai', 377 + i)),
  form(1735, 'aril', 404), form(1740, 'chaupai', 405),
  named(1746, 'savaiyya', undefined, 863), form(1751, 'dohra', 864),
]

const rehras = [
  named(2629, 'salok'), named(2632, 'salok'), named(2635, 'shabad'), named(2639, 'salok'),
  ...[2648, 2672, 2691, 2710, 2721, 2733, 2760, 2779, 2786].map((id, i) => named(id, 'shabad', undefined, i + 1)),
  form(2797, 'dohra'), form(2842, 'chaupai'),
  named(2881, 'composition', label('Benti Chaupai', 'ਬੇਨਤੀ ਚੌਪਈ', 'बेनती चौपई')),
  form(2991, 'aril'), form(2996, 'chaupai'), form(3011, 'dohra'), form(3014, 'chaupai'),
  ...[3044, 3047, 3050, 3053].map(id => form(id, 'dohra')),
  form(3097, 'chaupai'), ...[3138, 3141].map(id => form(id, 'dohra')), form(3144, 'soratha'),
  ...[3147, 3153, 3156, 3159, 3162].map(id => form(id, 'dohra')),
  named(3165, 'savaiyya'), form(3170, 'dohra'), form(3176, 'dohra'), named(3181, 'savaiyya'),
  form(3187, 'dohra'), form(3190, 'chaupai'), form(3199, 'dohra'), named(3204, 'savaiyya'), form(3209, 'dohra'),
  named(3214, 'composition', label('Anand · Pauris 1–5, 40', 'ਅਨੰਦੁ · ਪਉੜੀਆਂ 1–5, 40', 'अनंदु · पउड़ियाँ 1–5, 40')),
  named(3248, 'composition', label('Mundavani', 'ਮੁੰਦਾਵਣੀ', 'मुंदावणी')), named(3254, 'salok'),
  named(3259, 'pauri'), named(3268, 'salok'), named(3274, 'salok'),
]

const aarti = [
  form(3284, 'dohra'), named(3287, 'savaiyya'), form(3296, 'dohra'), named(3303, 'savaiyya'),
  form(3308, 'kabitt'), form(3313, 'kabitt'),
  ...[3318, 3323, 3328, 3333, 3342, 3351].map(id => named(id, 'savaiyya')),
  form(3360, 'dohra'), form(3364, 'dohra'),
  named(3367, 'chhand', label('Sri Kaal Ji Ki Ustat · Tribhangi', 'ਸ੍ਰੀ ਕਾਲ ਜੀ ਕੀ ਉਸਤਤਿ · ਤ੍ਰਿਭੰਗੀ', 'श्री काल जी की उसतति · त्रिभंगी')),
  named(3381, 'savaiyya'), form(3386, 'dohra'),
  ...[3389, 3404, 3414, 3424, 3433].map((id, i) => named(id, 'shabad', undefined, i + 1)),
  named(3443, 'savaiyya'), named(3452, 'savaiyya'), named(3457, 'savaiyya'), form(3462, 'dohra'), form(3466, 'dohra'),
  named(3469, 'shabad'), named(3488, 'salok'),
  ...[[3491, 51], [3493, 52], [3495, 56], [3497, 57]].map(([id, n]) => named(id, 'salok', undefined, n)),
  ...[[3499, 3], [3502, 4], [3504, 5]].map(([id, n]) => form(id, 'dohra', n)),
  named(3506, 'stanza', undefined, 91), form(3510, 'excerpt'),
  named(3512, 'composition', label('Excerpt · 56–62', 'ਅੰਸ਼ · 56–62', 'अंश · 56–62')),
  form(3526, 'excerpt'), named(3528, 'chhand', label('Bijai Chhand', 'ਬਿਜੈ ਛੰਦ', 'बिजै छंद')),
  named(3535, 'composition', label('Hukam Sat', 'ਹੁਕਮ ਸੱਤ', 'हुकम सत्त')), form(3543, 'dohra'),
  named(3546, 'stanza', label('Jaap excerpt · 199', 'ਜਾਪੁ ਅੰਸ਼ · 199', 'जापु अंश · 199'), 199),
]

const sohila = [
  named(3551, 'shabad', label('Sorath · Mahalla 5', 'ਸੋਰਠਿ · ਮਹਲਾ ੫', 'सोरठि · महला ५')),
  named(3562, 'shabad', label('Bilaval · Mahalla 5', 'ਬਿਲਾਵਲੁ · ਮਹਲਾ ੫', 'बिलावलु · महला ५')),
  named(3569, 'salok'), named(3572, 'salok'), named(3575, 'pauri'),
  ...[3594, 3606, 3614, 3627, 3638].map((id, i) => named(id, 'shabad', label(`Sohila · Shabad ${i + 1}`, `ਸੋਹਿਲਾ · ਸ਼ਬਦ ${i + 1}`, `सोहिला · शबद ${i + 1}`), i + 1)),
  named(3648, 'composition', label('Japji opening excerpt', 'ਜਪੁਜੀ ਆਰੰਭਕ ਅੰਸ਼', 'जपुजी आरंभिक अंश'), undefined, 3650),
  named(3652, 'closing-salok', label('Japji closing salok', 'ਜਪੁਜੀ ਅੰਤਿਮ ਸਲੋਕ', 'जपुजी अंतिम सलोक')),
  range(3660, 'Jaap excerpt · Chhapai', 'ਜਾਪੁ ਅੰਸ਼ · ਛਪੈ', 'जापु अंश · छप्पय', '1', 3663),
  range(3669, 'Jaap excerpt · Bhujang Prayaat', 'ਜਾਪੁ ਅੰਸ਼ · ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'जापु अंश · भुजंग प्रयात', '2–5'),
  range(3686, 'Jaap excerpt · Chachri', 'ਜਾਪੁ ਅੰਸ਼ · ਚਾਚਰੀ', 'जापु अंश · चाचरी', '94–95'),
  range(3695, 'Jaap excerpt · Bhujang Prayaat', 'ਜਾਪੁ ਅੰਸ਼ · ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'जापु अंश · भुजंग प्रयात', '197–199'),
]

const akal = [
  form(4022, 'opening'),
  range(4027, 'Chaupai', 'ਚੌਪਈ', 'चौपई', '1–10'),
  range(4069, 'Kabitt', 'ਕਬਿੱਤ', 'कबित्त', '11–20'),
  range(4110, 'Savaiye', 'ਸਵੱਯੇ', 'सवैये', '21–30'),
  range(4151, 'Tomar', 'ਤੋਮਰ', 'तोमर', '31–50'),
  range(4232, 'Laghu Niraj', 'ਲਘੁ ਨਿਰਾਜ', 'लघु निराज', '51–70'),
  range(4313, 'Kabitt', 'ਕਬਿੱਤ', 'कबित्त', '71–90'),
  range(4394, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '91–120'),
  range(4515, 'Padhri', 'ਪਾਧੜੀ', 'पाधड़ी', '121–140', 4516),
  range(4596, 'Totak', 'ਤੋਟਕ', 'तोटक', '141–160'),
  range(4677, 'Naraj', 'ਨਰਾਜ', 'नराज', '161–180'),
  range(4758, 'Rual', 'ਰੂਆਲ', 'रूआल', '181–200', 4759),
  range(4839, 'Dohra', 'ਦੋਹਰਾ', 'दोहरा', '201–210'),
  range(4860, 'Deeragh Tribhangi', 'ਦੀਰਘ ਤ੍ਰਿਭੰਗੀ', 'दीरघ त्रिभंगी', '211–230'),
  range(4941, 'Padhri', 'ਪਾਧੜੀ', 'पाधड़ी', '231–242'),
  range(4990, 'Savaiye', 'ਸ੍ਵੱਯੇ', 'सवैये', '243–252'),
  range(5031, 'Kabitt', 'ਕਬਿੱਤ', 'कबित्त', '253–266'),
  range(5088, 'Padhri', 'ਪਾਧੜੀ', 'पाधड़ी', '267–271'),
]

// These explicit start IDs were checked against every numbered ending 1–55.
const chandiStarts = [2051, 2058, 2067, 2075, 2083, 2087, 2090, 2095, 2104, 2111, 2117, 2123, 2127, 2133, 2137, 2145, 2149, 2155, 2161, 2172, 2179, 2183, 2187, 2191, 2195, 2200, 2205, 2209, 2217, 2224, 2230, 2235, 2239, 2249, 2256, 2262, 2268, 2272, 2278, 2286, 2297, 2309, 2313, 2324, 2332, 2340, 2344, 2348, 2353, 2361, 2373, 2377, 2384, 2390, 2396]

export const DASAM_COMPOSITE_REVIEWED_ANCHORS: Readonly<Record<number, readonly BaniProfileSectionSpec[]>> = {
  4: jaap,
  5: [1315, 1325, 1334, 1343, 1352, 1361, 1366, 1375, 1384, 1393].map((id, i) => named(id, 'shabad', undefined, i + 1)),
  6: stanzaSeries(1405, 10, 4, 'savaiyya'),
  7: stanzaSeries(1491, 10, 4, 'savaiyya'),
  8: [form(1534, 'opening'), ...Array.from({ length: 10 }, (_, i) => form(i === 0 ? 1539 : 1540 + i * 4, 'chaupai', i + 1))],
  9: chaupai,
  12: [range(2021, 'Bhujang Prayaat', 'ਭੁਜੰਗ ਪ੍ਰਯਾਤ', 'भुजंग प्रयात', '257–261'), form(2042, 'dohra', 262)],
  13: chandiStarts.map((id, i) => i === 5 ? form(id, 'dohra', 6) : named(id, 'pauri', undefined, i + 1)),
  19: Array.from({ length: 27 }, (_, i) => form(i === 0 ? 2572 : 2573 + i * 2, 'dohra', i + 1)),
  21: rehras,
  22: aarti,
  23: sohila,
  // Ardaas is a short prose prayer; do not invent canonical paragraph headings.
  24: [named(3708, 'composition', label('Ardaas', 'ਅਰਦਾਸ', 'अरदास'), undefined, 3714)],
  25: [named(3743, 'composition', label('Bhagauti Astotr', 'ਭਗਉਤੀ ਅਸਤੋਤ੍ਰ', 'भगउती असतोत्र')), form(3788, 'chaupai', undefined, 3789)],
  26: [named(3795, 'composition', label('Bhagauti Astotr', 'ਭਗਉਤੀ ਅਸਤੋਤ੍ਰ', 'भगउती असतोत्र'))],
  28: stanzaSeries(3966, 13, 4, 'savaiyya', 867),
  29: akal,
  53: [...[18358, 18406, 18454, 18502, 18550, 18598].map((id, i) => named(id, 'chhand', label(`Bhagvati Chhand ${i + 1}`, `ਭਗਵਤੀ ਛੰਦ ${i + 1}`, `भगवती छंद ${i + 1}`), i + 1)), form(18648, 'chaupai')],
}

/** Every selectable normalized version, not the raw provider flag order. */
export const DASAM_COMPOSITE_CAPTURE_CASES = [
  { baniDbId: 4, rows: 808 }, { baniDbId: 5, rows: 89 }, { baniDbId: 6, rows: 43 }, { baniDbId: 7, rows: 43 }, { baniDbId: 8, rows: 49 },
  { baniDbId: 9, length: 'short', rows: 104 }, { baniDbId: 9, length: 'medium', rows: 130 }, { baniDbId: 9, length: 'long', rows: 173 },
  { baniDbId: 12, rows: 26 }, { baniDbId: 13, rows: 357 }, { baniDbId: 19, rows: 61 },
  { baniDbId: 21, length: 'short', rows: 306 }, { baniDbId: 21, length: 'medium', rows: 337 }, { baniDbId: 21, length: 'long', rows: 439 }, { baniDbId: 21, length: 'extralong', rows: 521 },
  { baniDbId: 22, length: 'short', rows: 61 }, { baniDbId: 22, length: 'medium', rows: 82 }, { baniDbId: 22, length: 'long', rows: 230 },
  { baniDbId: 23, length: 'short', rows: 54 }, { baniDbId: 23, length: 'medium', rows: 61 }, { baniDbId: 23, length: 'long', rows: 86 }, { baniDbId: 23, length: 'extralong', rows: 145 },
  { baniDbId: 24, rows: 29 }, { baniDbId: 25, rows: 54 }, { baniDbId: 26, rows: 40 }, { baniDbId: 28, rows: 54 }, { baniDbId: 29, rows: 1091 }, { baniDbId: 53, rows: 308 },
] as const
