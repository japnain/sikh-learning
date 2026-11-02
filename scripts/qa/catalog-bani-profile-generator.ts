import type { BaniSectionProfile, BaniProfileSectionSpec } from '../../src/content/baniSections/profileTypes'
import type { ScriptureEntry, ScriptureLine } from '../../src/types'
import { fingerprintBaniReading } from '../../src/utils/baniSectionProfiles'

/**
 * Offline, reviewed source selectors. Never imported by the application.
 * Reproduce with UPDATE_BANI_CATALOG_PROFILES=1 npx vitest run
 * src/utils/catalogBaniProfiles.live.test.ts --configLoader runner
 *
 * These are exact positions in the captured 2026-11-01 reading, not runtime
 * punctuation or header heuristics. See the catalog research report and the
 * independent numbered-boundary review recorded in the tests.
 */
export const CATALOG_PROFILE_IDS = [
  1, 3, 14, 15, 16, 17, 18, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
  72, 73, 74, 75, 76, 79, 80, 81, 82, 83, 84, 85,
] as const

// Adjacent umbrella titles, performance instructions and retrospective counts
// were reviewed and excluded as standalone sections. Included labels remain
// literal Gurmukhi; they do not claim that every group is exactly one shabad.
const HEADING_IDS: Record<number, readonly number[]> = {
  3: [398, 416, 434, 447, 468, 480, 491],
  32: [7251, 7271, 7290, 7309, 7328, 7347, 7368, 7388, 7407, 7426, 7445, 7464, 7504, 7524, 7543, 7562, 7581, 7600, 7620, 7640, 7659, 7678, 7697, 7716],
  36: [25749, 25782, 25793, 25804, 25815, 25826, 25837, 25844, 25855, 25866, 25881, 25888, 25895, 25902, 25909, 25916, 25927, 25935, 25943, 25950, 25957, 25964, 25971, 25978, 25989, 25996, 26003, 26010, 26017, 26024, 26031, 26038, 26045, 26052],
  55: [18663, 18676, 18690, 18701, 18726],
  56: [18738, 18749, 18760, 18771, 18782, 18793, 18804, 18815, 18826, 18837, 18848, 18859, 18870, 18881, 18892, 18905, 18920, 18935, 18954, 18963, 18972, 18981, 18990, 18999, 19008, 19016, 19023, 19032, 19041, 19050, 19059, 19067, 19076, 19085, 19092, 19100, 19122, 19129, 19176, 19185, 19192, 19208, 19220, 19231, 19240, 19249, 19258, 19271, 19282, 19294, 19305, 19316, 19327, 19338, 19349, 19360, 19371, 19382, 19392, 19402, 19413, 19422, 19429, 19436, 19444, 19451, 19458, 19465, 19486, 19495, 19506, 19674, 19748, 19782, 19791, 19816, 19826, 19835],
  57: [19859, 19870, 19882, 19900, 19911, 19922, 19933, 19944, 19955, 19968, 19979, 19988, 19999, 20010, 20024, 20037, 20050, 20062, 20075, 20088, 20101, 20114, 20127, 20137, 20146, 20155, 20164, 20173, 20182, 20191, 20200, 20208, 20215, 20222, 20233, 20244, 20255, 20267, 20278, 20289, 20300, 20309, 20316, 20328, 20337, 20346, 20355, 20372, 20384, 20403, 20415],
  58: [20436, 20447, 20458, 20472, 20480, 20494, 20506, 20518],
  59: [20534, 20566, 20642, 20681, 20725, 20795],
  60: [20806, 20847, 20903, 20927, 20944, 20954, 20961],
  64: [21026, 21087, 21129, 21148],
  65: [21158, 21170, 21183, 21194, 21205, 21212, 21219, 21226, 21233, 21240, 21248, 21257, 21264, 21272, 21282, 21291],
  66: [21304, 21316, 21325, 21354, 21373, 21392, 21411, 21433, 21452, 21471, 21490, 21507, 21518, 21525, 21538, 21558, 21571, 21583, 21603],
  67: [21623, 21662, 21752, 21868, 21900, 21941, 21951],
  69: [22018, 22079, 22103, 22108, 22120, 22131, 22148, 22156],
  70: [22166, 22220],
  71: [22232, 22370, 22475, 22544, 22602, 22711, 22750, 22770],
  72: [22842, 22929, 22941, 22957, 22985, 23005],
  73: [23026, 23048, 23080],
  74: [23112, 23141, 23150, 23160, 23169],
  76: [23192, 23204, 23219, 23230, 23241, 23250, 23262, 23271, 23282],
}

const NUMBERED_BODY_STARTS: Record<number, readonly number[]> = {
  17: [2451,2455,2459,2463,2467,2471,2475,2479,2483,2487,2491,2495,2499,2503,2507,2511,2515,2519,2523,2527,2531,2535,2539],
  18: [2546,2548,2550,2551,2553,2555,2557,2559,2561,2563,2565],
  40: [9449,9455,9461,9467],
  41: [9476,9479,9481,9483,9485,9487,9489,9491,9493,9495],
  42: [9501,9509,9517],
  43: [9529,9533,9535,9537,9539,9541,9543,9545,9547,9549,9551,9553,9555,9557,9559,9561,9563,9565,9567,9569,9571,9573,9575,9577,9579,9581,9583,9585,9587,9589,9591,9593,9595,9596,9598],
  44: [9601,9605,9607,9609,9611,9613,9615,9617,9619,9621,9623,9625,9627,9629,9631,9633,9635,9637],
  46: [9742,9748,9754,9760,9766,9772],
  47: [9781,9786,9792,9796,9800,9804,9808,9812,9816,9820,9824,9828,9832,9836,9840,9844,9848],
  48: [9855,9863,9869,9875,9881,9887,9893,9899,9905,9911,9917,9922,9928,9934,9940,9946,9952,9958,9963,9969],
  50: [18214,18218,18222,18226,18230,18234,18238,18241],
  51: [18248,18256,18262,18268,18274,18280,18286,18291,18297,18303],
  52: [18312,18319,18324,18331,18338,18345],
  62: [20990,20996,26318],
  63: [21005,21016,26327],
  68: [21996,22006,22011],
  79: [24101,24109,24114,24119,24124,24130,24136,24142,24148],
  80: [24158,24165,24171,24177,24183,24191,24199,24205,24211,24217,24222],
  81: [24230,24234,24238,24242,24246,24250,24256,24262,24268,24274],
  82: [24283,24289,24293,24297,24301,24307,24313,24319,24323,24327],
  83: [24336,24344,24348,24352,24356,24362,24366,24370,24374,24380,24387,24393,24399,24405,24411,24417,24423,24429,24435,24442,24448,24454],
  84: [24460,24472,24476,24480,24484,24490,24496,24502,24508,24514,24518,24524,24528,24532,24537,24542,24547,24552,24557,24563,24569,24575,24580,24585,24590,24595,24601,24606,24611,24616,24636,24642,24648,24654,24658,24663,24667,24671,24676,24681,24686,24691,24696,24702,24706,24710,24714,24718,24722,24726,24734,24738,24742,24746,24752,24756,24760,24764,24768,24774],
  85: [24784,24796,24800,24804,24808,24814,24818,24824,24830,24835,24837,24839,24841,24847,24853,24857,24861,24865,24869,24875,24881],
}

const SINGLE_BODY_STARTS: Record<number, number> = {
  1: 3, 14: 2407, 15: 2424, 16: 2435, 38: 9218, 61: 20974, 75: 23185,
}
const RUTI_STARTS = [9642,9655,9667,9679,9691,9703,9715,9727]
const RUTI_EXCERPTS = [9649,9661,9673,9685,9697,9709,9721,9733]
const THITI_STARTS = [18002,18017,18029,18041,18053,18065,18077,18089,18101,18113,18125,18137,18149,18163,18175,18186,18198]
const THITI_EXCERPTS = [18007,18021,18033,18045,18057,18069,18081,18093,18105,18117,18129,18141,18153,18167,18179,18190,18202]
const sameLabel = (text: string) => ({ en: text, pa: text, hi: text })
const labels = (en: string, pa: string, hi: string) => ({ en, pa, hi })

const WEEKDAYS = [
  labels('Sunday', 'ਐਤਵਾਰ', 'रविवार'), labels('Monday', 'ਸੋਮਵਾਰ', 'सोमवार'),
  labels('Tuesday', 'ਮੰਗਲਵਾਰ', 'मंगलवार'), labels('Wednesday', 'ਬੁੱਧਵਾਰ', 'बुधवार'),
  labels('Thursday', 'ਵੀਰਵਾਰ', 'गुरुवार'), labels('Friday', 'ਸ਼ੁੱਕਰਵਾਰ', 'शुक्रवार'),
  labels('Saturday', 'ਸ਼ਨੀਵਾਰ', 'शनिवार'),
]
const RUTI_LABELS = [
  labels('Opening saloks and chhant', 'ਆਰੰਭਕ ਸਲੋਕ ਅਤੇ ਛੰਤ', 'आरंभिक सलोक और छंत'),
  labels('Basant · Chet / Vaisakh', 'ਬਸੰਤੁ · ਚੇਤੁ / ਵੈਸਾਖੁ', 'बसंत · चेत / वैसाख'),
  labels('Grikham · Jeth / Asarh', 'ਗ੍ਰੀਖਮ · ਜੇਠ / ਆਸਾੜ', 'ग्रीखम · जेठ / आषाढ़'),
  labels('Rain season · Savan / Bhadon', 'ਬਰਸੁ · ਸਾਵਣਿ / ਭਾਦਉ', 'वर्षा · सावन / भादों'),
  labels('Sarad · Assu / Katak', 'ਸਰਦ · ਅਸੁ / ਕਤਿਕ', 'शरद · अस्सू / कत्तक'),
  labels('Sisiar · Maghar / Poh', 'ਸਿਸੀਅਰ · ਮੰਘਰ / ਪੋਹਿ', 'सिसिअर · मघ्घर / पोह'),
  labels('Himkar · Magh / Phagun', 'ਹਿਮਕਰ · ਮਾਘ / ਫਗਣ', 'हिमकर · माघ / फागुन'),
  labels('Closing saloks and chhant', 'ਅੰਤਿਮ ਸਲੋਕ ਅਤੇ ਛੰਤ', 'अंतिम सलोक और छंत'),
]

export function buildCatalogBaniProfile(
  baniDbId: number,
  entries: readonly ScriptureEntry[],
  title: string,
): BaniSectionProfile {
  const lines = entries.flatMap(entry => entry.lines ?? [])
  const positions = new Map(lines.map((line, index) => [line.verseId, index]))
  const at = (id: number): ScriptureLine => {
    const position = positions.get(id)
    if (position === undefined) throw new Error(`Missing reviewed anchor ${baniDbId}/${id}`)
    return lines[position]
  }
  const sections: BaniProfileSectionSpec[] = []
  const add = (anchor: number, kind: string, number?: number, label?: BaniProfileSectionSpec['label'], excerpt?: number) => {
    at(anchor)
    if (excerpt !== undefined) at(excerpt)
    sections.push({
      id: `catalog-${baniDbId}-${anchor}`, kind,
      ...(number === undefined ? {} : { number }),
      ...(label === undefined ? {} : { label }),
      startVerseId: sections.length === 0 ? lines[0].verseId : anchor,
      ...(excerpt === undefined ? {} : { excerptVerseId: excerpt }),
    })
  }

  if (SINGLE_BODY_STARTS[baniDbId]) {
    add(lines[0].verseId, 'composition', undefined, sameLabel(title), SINGLE_BODY_STARTS[baniDbId])
  } else if (baniDbId === 45) {
    RUTI_STARTS.forEach((start, index) => add(start, 'chhand', undefined, RUTI_LABELS[index], RUTI_EXCERPTS[index]))
  } else if (baniDbId === 49) {
    THITI_STARTS.forEach((start, index) => add(start, 'pauri', index + 1,
      labels(`Salok + Pauri ${index + 1}`, `ਸਲੋਕ + ਪਉੜੀ ${index + 1}`, `सलोक + पउड़ी ${index + 1}`),
      THITI_EXCERPTS[index]))
  } else if (NUMBERED_BODY_STARTS[baniDbId]) {
    NUMBERED_BODY_STARTS[baniDbId].forEach((body, index) => {
      let anchor = body
      let kind = baniDbId >= 79 ? 'savaiyya' : [42,62,63,68].includes(baniDbId) ? 'shabad' : 'stanza'
      let number: number | undefined = index + 1
      let label: BaniProfileSectionSpec['label']
      if (baniDbId === 47) {
        if (index === 0) { anchor = 9780; kind = 'opening-salok'; number = undefined }
        else { number = index; if (index === 1) anchor = 9785 }
      }
      if (baniDbId === 50) {
        label = index < 7 ? WEEKDAYS[index] : labels('Closing stanza', 'ਅੰਤਿਮ ਪਦ', 'अंतिम पद')
      }
      if (baniDbId === 51) {
        const dayIndexes = [0,1,2,3,-1,4,5,6,-1,-1]
        label = dayIndexes[index] >= 0 ? WEEKDAYS[dayIndexes[index]]
          : index === 4 ? labels('Stanza 5', 'ਪਦ 5', 'पद 5')
          : labels(`Closing stanza ${index - 7}`, `ਅੰਤਿਮ ਪਦ ${index - 7}`, `अंतिम पद ${index - 7}`)
      }
      if (baniDbId === 63 && index === 1) anchor = 21015 // Printed Namdev heading has header=0.
      if (baniDbId === 85 && index >= 9 && index <= 11) {
        if (index === 9) anchor = 24834
        kind = 'soratha'
        number = index - 8
        label = labels(`Soratha ${number}`, `ਸੋਰਠਾ ${number}`, `सोरठा ${number}`)
      }
      add(anchor, kind, number, label, body)
    })
  } else if (HEADING_IDS[baniDbId]) {
    const anchors = HEADING_IDS[baniDbId]
    anchors.forEach((heading, index) => {
      const start = positions.get(heading)!
      const end = index + 1 < anchors.length ? positions.get(anchors[index + 1])! : lines.length
      const body = lines.slice(start + 1, end).find(line => !line.isHeader)
      if (!body) throw new Error(`Heading without body ${baniDbId}/${heading}`)
      const kind = baniDbId === 32 ? 'ashtpadi' : baniDbId === 3 || baniDbId === 36 ? 'shabad' : 'provider-heading'
      const raag = [
        labels('Bilaval', 'ਬਿਲਾਵਲੁ', 'बिलावल'), labels('Nat', 'ਨਟ', 'नट'),
        labels('Kanara', 'ਕਾਨੜਾ', 'कानड़ा'), labels('Kalyan', 'ਕਲਿਆਨ', 'कल्याण'),
      ][Math.floor(index / 6)]
      const localAshtpadi = index % 6 + 1
      const label = kind === 'provider-heading' ? sameLabel(at(heading).gurmukhi)
        : baniDbId === 32 ? labels(`${raag.en} · Ashtpadi ${localAshtpadi}`, `${raag.pa} · ਅਸ਼ਟਪਦੀ ${localAshtpadi}`, `${raag.hi} · अष्टपदी ${localAshtpadi}`)
        : undefined
      // IDs mark source order. No numerical sort: high mangal IDs precede lower
      // composition IDs in several captured readings.
      add(heading, kind, kind === 'provider-heading' ? undefined : index + 1,
        label, body.verseId)
    })
  } else throw new Error(`Unreviewed catalog ID ${baniDbId}`)

  return { baniDbId, fingerprint: fingerprintBaniReading(entries), sections }
}

