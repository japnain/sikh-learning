import type { BaniProfileSectionSpec } from '../../../src/content/baniSections/profileTypes'

const labels = (en: string, pa: string, hi: string) => ({ en, pa, hi })
const incipit = (text: string) => labels(text, text, text)

export const COMPOSITION_FINE_REVIEWED_FINGERPRINTS: Readonly<Record<number, string>> = {
  24: 'bani-v1:29:e4ceed9285768686',
  31: 'bani-v1:2019:c1b22c8d9185fae1',
  38: 'bani-v1:62:f886d4647af98830',
}

/** Raag-family transitions, not numbered pauris; the opening retains its mangal/title. */
export const RAAG_MAALA_LANDMARKS: readonly BaniProfileSectionSpec[] = [
  { id: 'raag-maala-opening', kind: 'composition', label: labels('Opening', 'ਆਰੰਭ', 'आरंभ'), startVerseId: 9216, excerptVerseId: 9218 },
  { id: 'raag-maala-bhairao', kind: 'composition', label: labels('Raag Bhairao', 'ਰਾਗ ਭੈਰਉ', 'राग भैरउ'), startVerseId: 9220 },
  { id: 'raag-maala-maalkausak', kind: 'composition', label: labels('Raag Maalkausak', 'ਰਾਗ ਮਾਲਕਉਸਕ', 'राग मालकउसक'), startVerseId: 9230 },
  { id: 'raag-maala-hindol', kind: 'composition', label: labels('Raag Hindol', 'ਰਾਗ ਹਿੰਡੋਲੁ', 'राग हिंडोलु'), startVerseId: 9240 },
  { id: 'raag-maala-deepak', kind: 'composition', label: labels('Raag Deepak', 'ਰਾਗ ਦੀਪਕ', 'राग दीपक'), startVerseId: 9251 },
  { id: 'raag-maala-siri-raag', kind: 'composition', label: labels('Siri Raag', 'ਸਿਰੀਰਾਗ', 'सिरीराग'), startVerseId: 9258 },
  { id: 'raag-maala-megh', kind: 'composition', label: labels('Raag Megh', 'ਰਾਗ ਮੇਘ', 'राग मेघ'), startVerseId: 9266 },
]

/** Short source incipits, retained verbatim across locales; these are navigational
 * landmarks in the captured prose prayer, not invented canonical section names.
 */
export const ARDAAS_LANDMARKS: readonly BaniProfileSectionSpec[] = [
  { id: 'ardaas-opening', kind: 'composition', label: incipit('ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ'), startVerseId: 3708, excerptVerseId: 3709 },
  { id: 'ardaas-pritham', kind: 'composition', label: incipit('ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ'), startVerseId: 3714 },
  { id: 'ardaas-dasven', kind: 'composition', label: incipit('ਦਸਵੇਂ ਪਾਤਸ਼ਾਹ'), startVerseId: 3720 },
  { id: 'ardaas-dasan', kind: 'composition', label: incipit('ਦਸਾਂ ਪਾਤਸ਼ਾਹੀਆਂ ਜੀ ਦੀ ਜੋਤ'), startVerseId: 3721 },
  { id: 'ardaas-panj-pyare', kind: 'composition', label: incipit('ਪੰਜਾ ਪਿਆਰਿਆਂ ਚੌਹਾਂ ਸਾਹਿਬਜ਼ਾਦਿਆਂ'), startVerseId: 3722 },
  { id: 'ardaas-singh-singhnian', kind: 'composition', label: incipit('ਜਿਨ੍ਹਾਂ ਸਿੰਘਾਂ ਸਿੰਘਣੀਆਂ ਨੇ'), startVerseId: 3723 },
  { id: 'ardaas-panj-takht', kind: 'composition', label: incipit('ਪੰਜਾਂ ਤਖ਼ਤਾਂ ਸਰਬੱਤ ਗੁਰਦੁਆਰਿਆਂ'), startVerseId: 3724 },
  { id: 'ardaas-sarbatt-khalsa', kind: 'composition', label: incipit('ਪ੍ਰਿਥਮੇ ਸਰਬੱਤ ਖਾਲਸਾ ਜੀ ਕੀ ਅਰਦਾਸ'), startVerseId: 3725 },
  { id: 'ardaas-sikhi-daan', kind: 'composition', label: incipit('ਸਿੱਖਾਂ ਨੂੰ ਸਿੱਖੀ ਦਾਨ'), startVerseId: 3727 },
  { id: 'ardaas-man-nivan', kind: 'composition', label: incipit('ਸਿੱਖਾਂ ਦਾ ਮਨ ਨੀਵਾਂ ਮੱਤ ਉੱਚੀ'), startVerseId: 3728 },
  { id: 'ardaas-akal-purakh', kind: 'composition', label: incipit('ਹੇ ਅਕਾਲ ਪੁਰਖ'), startVerseId: 3729 },
  { id: 'ardaas-nimanian', kind: 'composition', label: incipit('ਹੇ ਨਿਮਾਣਿਆ ਦੇ ਮਾਣ'), startVerseId: 3731 },
  { id: 'ardaas-nanak-naam', kind: 'composition', label: incipit('ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ'), startVerseId: 3735 },
  { id: 'ardaas-khalsa-fateh', kind: 'composition', label: incipit('ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ'), startVerseId: 3736 },
]

/** Reviewed offline against printed stanza terminals; bani-local IDs, never global verse IDs.
 * The sole rahau at 5249–5250 stays with stanza 1; stanza 2 begins at 5251.
 */
export const SUKHMANI_STANZA_STARTS = [
  [5239, 5251, 5261, 5271, 5281, 5291, 5301, 5311],
  [5325, 5335, 5345, 5355, 5365, 5375, 5385, 5395],
  [5409, 5419, 5429, 5439, 5449, 5459, 5469, 5479],
  [5493, 5502, 5512, 5522, 5532, 5542, 5552, 5562],
  [5576, 5586, 5596, 5605, 5615, 5625, 5635, 5645],
  [5659, 5669, 5679, 5689, 5699, 5709, 5719, 5729],
  [5744, 5754, 5764, 5774, 5784, 5794, 5804, 5814],
  [5829, 5839, 5849, 5859, 5869, 5879, 5889, 5899],
  [5915, 5925, 5935, 5945, 5955, 5965, 5975, 5985],
  [5999, 6009, 6019, 6029, 6039, 6049, 6059, 6069],
  [6083, 6093, 6103, 6113, 6123, 6133, 6143, 6153],
  [6167, 6177, 6187, 6197, 6207, 6217, 6227, 6237],
  [6251, 6261, 6271, 6281, 6291, 6301, 6311, 6321],
  [6335, 6345, 6355, 6365, 6375, 6385, 6395, 6405],
  [6419, 6429, 6439, 6448, 6458, 6467, 6477, 6487],
  [6501, 6511, 6521, 6530, 6540, 6550, 6560, 6570],
  [6584, 6594, 6604, 6614, 6624, 6634, 6644, 6654],
  [6668, 6678, 6688, 6698, 6708, 6717, 6726, 6736],
  [6750, 6760, 6770, 6780, 6790, 6800, 6810, 6820],
  [6834, 6844, 6854, 6864, 6874, 6884, 6894, 6904],
  [6918, 6928, 6938, 6948, 6958, 6968, 6978, 6988],
  [7002, 7012, 7022, 7032, 7042, 7052, 7062, 7072],
  [7086, 7096, 7106, 7116, 7126, 7136, 7146, 7156],
  [7170, 7180, 7190, 7200, 7210, 7220, 7229, 7239],
] as const

/** Independent closing-row evidence for tests; not part of runtime navigation. */
export const SUKHMANI_STANZA_ENDS = [
  [5248, 5260, 5270, 5280, 5290, 5300, 5310, 5320],
  [5334, 5344, 5354, 5364, 5374, 5384, 5394, 5404],
  [5418, 5428, 5438, 5448, 5458, 5468, 5478, 5488],
  [5501, 5511, 5521, 5531, 5541, 5551, 5561, 5571],
  [5585, 5595, 5604, 5614, 5624, 5634, 5644, 5654],
  [5668, 5678, 5688, 5698, 5708, 5718, 5728, 5738],
  [5753, 5763, 5773, 5783, 5793, 5803, 5813, 5823],
  [5838, 5848, 5858, 5868, 5878, 5888, 5898, 5908],
  [5924, 5934, 5944, 5954, 5964, 5974, 5984, 5994],
  [6008, 6018, 6028, 6038, 6048, 6058, 6068, 6078],
  [6092, 6102, 6112, 6122, 6132, 6142, 6152, 6162],
  [6176, 6186, 6196, 6206, 6216, 6226, 6236, 6246],
  [6260, 6270, 6280, 6290, 6300, 6310, 6320, 6330],
  [6344, 6354, 6364, 6374, 6384, 6394, 6404, 6414],
  [6428, 6438, 6447, 6457, 6466, 6476, 6486, 6496],
  [6510, 6520, 6529, 6539, 6549, 6559, 6569, 6579],
  [6593, 6603, 6613, 6623, 6633, 6643, 6653, 6663],
  [6677, 6687, 6697, 6707, 6716, 6725, 6735, 6745],
  [6759, 6769, 6779, 6789, 6799, 6809, 6819, 6829],
  [6843, 6853, 6863, 6873, 6883, 6893, 6903, 6913],
  [6927, 6937, 6947, 6957, 6967, 6977, 6987, 6997],
  [7011, 7021, 7031, 7041, 7051, 7061, 7071, 7081],
  [7095, 7105, 7115, 7125, 7135, 7145, 7155, 7165],
  [7179, 7189, 7199, 7209, 7219, 7228, 7238, 7248],
] as const
