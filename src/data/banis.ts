export interface Bani {
  id: string
  name: string
  scripture: 'SGGS' | 'DG' | 'BGV' | 'AK'
  source: 'G' | 'D' | 'B' | 'A'
  startAng: number
  endAng: number
  category: string
  description: string
  type?: 'browse-only'
}

export const BANIS: Bani[] = [
  // ── SGGS · Daily Prayers ─────────────────────────────────────────────────
  { id: 'japji-sahib', name: 'Japji Sahib', scripture: 'SGGS', source: 'G', startAng: 1, endAng: 8, category: 'Daily Prayers', description: 'Opening bani of SGGS Ji — recited every morning at amrit vela.' },
  { id: 'anand-sahib', name: 'Anand Sahib', scripture: 'SGGS', source: 'G', startAng: 917, endAng: 922, category: 'Daily Prayers', description: 'Bani of bliss by Guru Amar Das Ji, part of the Nitnem.' },
  { id: 'rehras-sahib', name: 'Rehras Sahib', scripture: 'SGGS', source: 'G', startAng: 8, endAng: 12, category: 'Daily Prayers', description: 'Evening prayer — a collection of shabads recited at dusk.' },
  { id: 'kirtan-sohila', name: 'Kirtan Sohila', scripture: 'SGGS', source: 'G', startAng: 12, endAng: 13, category: 'Daily Prayers', description: 'Night prayer recited before sleep, celebrating the soul\'s union with Waheguru.' },
  { id: 'sodar', name: 'Sodar', scripture: 'SGGS', source: 'G', startAng: 8, endAng: 8, category: 'Daily Prayers', description: 'Asks where the gate of the Lord is — opens Rehras Sahib.' },

  // ── SGGS · Long Compositions ─────────────────────────────────────────────
  { id: 'sukhmani-sahib', name: 'Sukhmani Sahib', scripture: 'SGGS', source: 'G', startAng: 262, endAng: 296, category: 'Long Compositions', description: 'Pearl of Peace — most cherished composition of Guru Arjan Dev Ji.' },
  { id: 'asa-di-var', name: 'Asa Di Var', scripture: 'SGGS', source: 'G', startAng: 462, endAng: 475, category: 'Long Compositions', description: 'Morning ballad by Guru Nanak Dev Ji, sung in Asa raag at dawn.' },
  { id: 'sidh-gosht', name: 'Sidh Gosht', scripture: 'SGGS', source: 'G', startAng: 938, endAng: 946, category: 'Long Compositions', description: 'Dialogue between Guru Nanak Dev Ji and the Siddhas on the nature of the Divine.' },
  { id: 'onkar', name: 'Onkar', scripture: 'SGGS', source: 'G', startAng: 929, endAng: 938, category: 'Long Compositions', description: 'Composition by Guru Nanak Dev Ji on the nature of the One Creator.' },
  { id: 'bavan-akhri', name: 'Bavan Akhri', scripture: 'SGGS', source: 'G', startAng: 250, endAng: 262, category: 'Long Compositions', description: 'Acrostic poem by Guru Arjan Dev Ji covering all 52 letters of the Gurmukhi alphabet.' },
  { id: 'barah-maha-majh', name: 'Barah Maha (Majh)', scripture: 'SGGS', source: 'G', startAng: 133, endAng: 136, category: 'Long Compositions', description: 'Twelve months — the soul\'s longing for the Divine through the seasons, in Majh raag.' },
  { id: 'barah-maha-tukhari', name: 'Barah Maha (Tukhari)', scripture: 'SGGS', source: 'G', startAng: 1107, endAng: 1110, category: 'Long Compositions', description: 'Twelve months by Guru Arjan Dev Ji in Tukhari raag.' },
  { id: 'pehre', name: 'Pehre', scripture: 'SGGS', source: 'G', startAng: 74, endAng: 78, category: 'Long Compositions', description: 'The four watches of the night — describes the stages of human life.' },
  { id: 'ghorian', name: 'Ghorian', scripture: 'SGGS', source: 'G', startAng: 573, endAng: 577, category: 'Long Compositions', description: 'Wedding songs describing the soul\'s union with Waheguru.' },
  { id: 'alahanian', name: 'Alahanian', scripture: 'SGGS', source: 'G', startAng: 578, endAng: 582, category: 'Long Compositions', description: 'Songs of lamentation — the soul weeps at separation from the Divine.' },

  // ── SGGS · Vars ──────────────────────────────────────────────────────────
  { id: 'var-majh', name: 'Var Majh', scripture: 'SGGS', source: 'G', startAng: 137, endAng: 150, category: 'Vars', description: 'Ballad in Majh raag by Guru Nanak Dev Ji on devotion and ego.' },
  { id: 'var-gujri', name: 'Var Gujri', scripture: 'SGGS', source: 'G', startAng: 508, endAng: 517, category: 'Vars', description: 'Ballad in Gujri raag by Guru Nanak Dev Ji.' },
  { id: 'var-vadahans', name: 'Var Vadahans', scripture: 'SGGS', source: 'G', startAng: 585, endAng: 590, category: 'Vars', description: 'Ballad in Vadahans raag by Guru Nanak Dev Ji and Guru Ram Das Ji.' },
  { id: 'var-sorath', name: 'Var Sorath', scripture: 'SGGS', source: 'G', startAng: 642, endAng: 647, category: 'Vars', description: 'Ballad in Sorath raag by Guru Ram Das Ji.' },
  { id: 'var-suhi', name: 'Var Suhi', scripture: 'SGGS', source: 'G', startAng: 785, endAng: 792, category: 'Vars', description: 'Ballad in Suhi raag by Guru Ram Das Ji and Guru Nanak Dev Ji.' },
  { id: 'var-bilaval', name: 'Var Bilaval', scripture: 'SGGS', source: 'G', startAng: 849, endAng: 855, category: 'Vars', description: 'Ballad in Bilaval raag by Guru Ram Das Ji.' },
  { id: 'var-ramkali', name: 'Var Ramkali', scripture: 'SGGS', source: 'G', startAng: 947, endAng: 956, category: 'Vars', description: 'Ballad in Ramkali raag by Guru Nanak Dev Ji.' },
  { id: 'var-sarang', name: 'Var Sarang', scripture: 'SGGS', source: 'G', startAng: 1237, endAng: 1244, category: 'Vars', description: 'Ballad in Sarang raag by Guru Ram Das Ji.' },
  { id: 'var-malhar', name: 'Var Malhar', scripture: 'SGGS', source: 'G', startAng: 1278, endAng: 1283, category: 'Vars', description: 'Ballad in Malhar raag by Guru Nanak Dev Ji.' },
  { id: 'var-maru', name: 'Var Maru', scripture: 'SGGS', source: 'G', startAng: 1087, endAng: 1096, category: 'Vars', description: 'Ballad in Maru raag by Guru Nanak Dev Ji and Guru Arjan Dev Ji.' },

  // ── SGGS · Saloks & Short Banis ───────────────────────────────────────────
  { id: 'salok-mahalla-9', name: 'Salok Mahalla 9', scripture: 'SGGS', source: 'G', startAng: 1426, endAng: 1429, category: 'Saloks & Short Banis', description: 'Saloks of Guru Tegh Bahadur Ji on impermanence, detachment, and the Divine.' },
  { id: 'salok-kabir', name: 'Salok Kabir Ji', scripture: 'SGGS', source: 'G', startAng: 1364, endAng: 1377, category: 'Saloks & Short Banis', description: 'Couplets of Bhagat Kabir Ji on truth, devotion, and the nature of the Divine.' },
  { id: 'salok-farid', name: 'Salok Sheikh Farid Ji', scripture: 'SGGS', source: 'G', startAng: 1377, endAng: 1384, category: 'Saloks & Short Banis', description: 'Couplets of Sufi saint Sheikh Farid Ji on love, life, and the Divine.' },
  { id: 'salok-sehskritee', name: 'Salok Sehskritee', scripture: 'SGGS', source: 'G', startAng: 1353, endAng: 1360, category: 'Saloks & Short Banis', description: 'Saloks in Sanskrit by Guru Arjan Dev Ji and Guru Nanak Dev Ji.' },
  { id: 'patti', name: 'Patti', scripture: 'SGGS', source: 'G', startAng: 432, endAng: 435, category: 'Saloks & Short Banis', description: 'Alphabet composition by Guru Nanak Dev Ji — each letter praises the Divine.' },
  { id: 'laavan', name: 'Laavan', scripture: 'SGGS', source: 'G', startAng: 773, endAng: 774, category: 'Saloks & Short Banis', description: 'Four rounds of the Anand Karaj (Sikh wedding ceremony) by Guru Ram Das Ji.' },
  { id: 'shabad-hazare', name: 'Shabad Hazare (M.5)', scripture: 'SGGS', source: 'G', startAng: 295, endAng: 296, category: 'Saloks & Short Banis', description: 'Thousand-fold shabads of longing for the Guru by Guru Arjan Dev Ji.' },
  { id: 'mundavani', name: 'Mundavani', scripture: 'SGGS', source: 'G', startAng: 1429, endAng: 1429, category: 'Saloks & Short Banis', description: 'Seal of SGGS Ji — Guru Arjan Dev Ji\'s closing statement on the three gifts of gurbani.' },
  { id: 'ragmala', name: 'Ragmala', scripture: 'SGGS', source: 'G', startAng: 1430, endAng: 1430, category: 'Saloks & Short Banis', description: 'Garland of raags — a listing of the musical modes of SGGS Ji.' },
  { id: 'gatha', name: 'Gatha', scripture: 'SGGS', source: 'G', startAng: 1360, endAng: 1360, category: 'Saloks & Short Banis', description: 'Composition by Guru Arjan Dev Ji in Sanskrit-style verse.' },
  { id: 'funhe', name: 'Funhe', scripture: 'SGGS', source: 'G', startAng: 1360, endAng: 1361, category: 'Saloks & Short Banis', description: 'Short playful couplets by Guru Arjan Dev Ji.' },
  { id: 'chaubole', name: 'Chaubole', scripture: 'SGGS', source: 'G', startAng: 1362, endAng: 1363, category: 'Saloks & Short Banis', description: 'Four-line verses by Guru Arjan Dev Ji.' },
  { id: 'thiiti-majh', name: 'Thiiti (Majh)', scripture: 'SGGS', source: 'G', startAng: 296, endAng: 300, category: 'Saloks & Short Banis', description: 'Lunar calendar composition by Guru Nanak Dev Ji in Majh raag.' },
  { id: 'ramkali-sadd', name: 'Ramkali Sadd', scripture: 'SGGS', source: 'G', startAng: 923, endAng: 924, category: 'Saloks & Short Banis', description: 'Call of the Divine — recited at moments of spiritual transition.' },
  { id: 'aarti', name: 'Aarti', scripture: 'SGGS', source: 'G', startAng: 663, endAng: 663, category: 'Saloks & Short Banis', description: 'Guru Nanak Dev Ji\'s celebration of Waheguru as the true light of the universe.' },
  { id: 'swaiyas-m3', name: 'Swaiyas (M.3)', scripture: 'SGGS', source: 'G', startAng: 1385, endAng: 1389, category: 'Saloks & Short Banis', description: 'Swaiyas in praise of the third Guru, Guru Amar Das Ji.' },
  { id: 'swaiyas-m4', name: 'Swaiyas (M.4)', scripture: 'SGGS', source: 'G', startAng: 1389, endAng: 1396, category: 'Saloks & Short Banis', description: 'Swaiyas in praise of the fourth Guru, Guru Ram Das Ji.' },
  { id: 'swaiyas-m5', name: 'Swaiyas (M.5)', scripture: 'SGGS', source: 'G', startAng: 1396, endAng: 1409, category: 'Saloks & Short Banis', description: 'Swaiyas in praise of the fifth Guru, Guru Arjan Dev Ji.' },
  { id: 'dakhne-m5', name: 'Dakhne (M.5)', scripture: 'SGGS', source: 'G', startAng: 1096, endAng: 1101, category: 'Saloks & Short Banis', description: 'Southern couplets by Guru Arjan Dev Ji.' },
  { id: 'dukh-bhanjani', name: 'Dukh Bhanjani Sahib', scripture: 'SGGS', source: 'G', startAng: 218, endAng: 220, category: 'Saloks & Short Banis', description: 'Destroyer of suffering — healing shabads compiled from Guru Arjan Dev Ji\'s bani.' },
  { id: 'shabad-hazare-m1', name: 'Shabad Hazare (M.1)', scripture: 'SGGS', source: 'G', startAng: 14, endAng: 15, category: 'Saloks & Short Banis', description: 'Thousand-fold shabads of Guru Nanak Dev Ji on longing for the Divine.' },
  { id: 'salok-vaaran-te-vadhik', name: 'Salok Vaaran Te Vadhik', scripture: 'SGGS', source: 'G', startAng: 1410, endAng: 1426, category: 'Saloks & Short Banis', description: 'Additional saloks by the Gurus beyond those in the Vars.' },
  { id: 'birhade', name: 'Birhade', scripture: 'SGGS', source: 'G', startAng: 557, endAng: 558, category: 'Saloks & Short Banis', description: 'Songs of separation — the soul\'s anguish at being apart from the Divine.' },
  { id: 'chhant-dhanasri', name: 'Chhant Dhanasri (M.1)', scripture: 'SGGS', source: 'G', startAng: 687, endAng: 689, category: 'Long Compositions', description: 'Lyrical composition by Guru Nanak Dev Ji in Dhanasri raag on Divine love.' },
  { id: 'salok-m1', name: 'Salok Mahalla 1', scripture: 'SGGS', source: 'G', startAng: 1410, endAng: 1412, category: 'Saloks & Short Banis', description: 'Couplets of Guru Nanak Dev Ji on truth and the nature of the Divine.' },
  { id: 'salok-m2', name: 'Salok Mahalla 2', scripture: 'SGGS', source: 'G', startAng: 1412, endAng: 1414, category: 'Saloks & Short Banis', description: 'Couplets of Guru Angad Dev Ji on humility and devotion.' },
  { id: 'salok-m3', name: 'Salok Mahalla 3', scripture: 'SGGS', source: 'G', startAng: 1414, endAng: 1421, category: 'Saloks & Short Banis', description: 'Couplets of Guru Amar Das Ji on ego, service, and the Guru\'s grace.' },
  { id: 'salok-m4', name: 'Salok Mahalla 4', scripture: 'SGGS', source: 'G', startAng: 1421, endAng: 1423, category: 'Saloks & Short Banis', description: 'Couplets of Guru Ram Das Ji on love and longing for the Divine.' },
  { id: 'salok-m5', name: 'Salok Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 1423, endAng: 1426, category: 'Saloks & Short Banis', description: 'Couplets of Guru Arjan Dev Ji on surrender, trust, and the Divine Name.' },

  // ── Dasam Granth · Daily Prayers ─────────────────────────────────────────
  { id: 'jaap-sahib', name: 'Jaap Sahib', scripture: 'DG', source: 'D', startAng: 1, endAng: 10, category: 'Daily Prayers', description: 'Morning Nitnem bani by Guru Gobind Singh Ji listing the names of the Divine.' },
  { id: 'tav-prasad-savaiye', name: 'Tav Prasad Savaiye', scripture: 'DG', source: 'D', startAng: 10, endAng: 10, category: 'Daily Prayers', description: 'Swaiyas of Guru Gobind Singh Ji rejecting empty rituals and praising true devotion.' },
  { id: 'chaupai-sahib', name: 'Chaupai Sahib', scripture: 'DG', source: 'D', startAng: 201, endAng: 205, category: 'Daily Prayers', description: 'Prayer of protection by Guru Gobind Singh Ji, part of the evening Nitnem.' },

  // ── Dasam Granth · Bir Ras ────────────────────────────────────────────────
  { id: 'chandi-charitar-1', name: 'Chandi Charitar 1', scripture: 'DG', source: 'D', startAng: 65, endAng: 82, category: 'Bir Ras', description: 'Warrior composition narrating the battles of Goddess Chandi.' },
  { id: 'chandi-charitar-2', name: 'Chandi Charitar 2', scripture: 'DG', source: 'D', startAng: 83, endAng: 95, category: 'Bir Ras', description: 'Second composition on the exploits of Chandi, filled with heroic Braj Bhasha poetry.' },
  { id: 'chandi-di-var', name: 'Chandi Di Var', scripture: 'DG', source: 'D', startAng: 95, endAng: 98, category: 'Bir Ras', description: 'Heroic Punjabi ballad by Guru Gobind Singh Ji — the most celebrated bir ras bani.' },
  { id: 'ugardanti', name: 'Ugardanti', scripture: 'DG', source: 'D', startAng: 55, endAng: 64, category: 'Bir Ras', description: 'Fierce prayer to the Divine — a powerful invocation of the protector of the righteous.' },
  { id: 'ram-avtar', name: 'Ram Avtar', scripture: 'DG', source: 'D', startAng: 296, endAng: 338, category: 'Bir Ras', description: 'Epic retelling of the story of Rama by Guru Gobind Singh Ji in heroic poetry.' },
  { id: 'krishna-avtar', name: 'Krishna Avtar', scripture: 'DG', source: 'D', startAng: 154, endAng: 296, category: 'Bir Ras', description: 'Longest composition in Dasam Granth — the story of Krishna as a heroic warrior and liberator.' },

  // ── Dasam Granth · Major Compositions ────────────────────────────────────
  { id: 'akal-ustat', name: 'Akal Ustat', scripture: 'DG', source: 'D', startAng: 11, endAng: 41, category: 'Major Compositions', description: 'Praise of the Timeless One — Guru Gobind Singh Ji\'s meditation on the formless Divine.' },
  { id: 'bachitra-natak', name: 'Bachitra Natak', scripture: 'DG', source: 'D', startAng: 94, endAng: 151, category: 'Major Compositions', description: 'Wonderful Drama — Guru Gobind Singh Ji\'s autobiography and account of his divine mission.' },
  { id: 'gyan-parbodh', name: 'Gyan Parbodh', scripture: 'DG', source: 'D', startAng: 339, endAng: 358, category: 'Major Compositions', description: 'Awakening of Knowledge — philosophical discourse on the nature of God and creation.' },
  { id: 'zafarnama', name: 'Zafarnama', scripture: 'DG', source: 'D', startAng: 393, endAng: 404, category: 'Major Compositions', description: 'Letter of Victory — Guru Gobind Singh Ji\'s Persian letter to Aurangzeb after Chamkaur.' },
  { id: 'chaubis-avtar', name: 'Chaubis Avtar', scripture: 'DG', source: 'D', startAng: 41, endAng: 153, category: 'Major Compositions', description: '24 Avatars — Guru Gobind Singh Ji\'s retelling of stories of divine incarnations.' },
  { id: 'brahm-avtar', name: 'Brahm Avtar', scripture: 'DG', source: 'D', startAng: 339, endAng: 344, category: 'Major Compositions', description: 'Avatars of Brahma — compositions on sages and divine teachers.' },
  { id: 'rudra-avtar', name: 'Rudra Avtar', scripture: 'DG', source: 'D', startAng: 344, endAng: 358, category: 'Major Compositions', description: 'Avatars of Rudra — heroic compositions on divine warriors.' },

  // ── Dasam Granth · Shorter Banis ─────────────────────────────────────────
  { id: 'shabad-hazare-10', name: 'Shabad Hazare Patshahi 10', scripture: 'DG', source: 'D', startAng: 134, endAng: 136, category: 'Shorter Banis', description: 'Shabads of longing and love by Guru Gobind Singh Ji.' },
  { id: 'swaiyas-patshahi-10', name: 'Swaiyas Patshahi 10', scripture: 'DG', source: 'D', startAng: 13, endAng: 18, category: 'Shorter Banis', description: 'Swaiyas in praise of Guru Gobind Singh Ji.' },
  { id: 'sastra-naam-mala', name: 'Sastra Naam Mala', scripture: 'DG', source: 'D', startAng: 358, endAng: 393, category: 'Shorter Banis', description: 'Garland of Weapons — meditation on the Divine through the names of weapons.' },
  { id: 'khalsa-mehma', name: 'Khalsa Mehma', scripture: 'DG', source: 'D', startAng: 63, endAng: 64, category: 'Shorter Banis', description: 'Praise of the Khalsa — Guru Gobind Singh Ji\'s tribute to the purity of the Khalsa.' },
  { id: 'hikayats', name: 'Hikayats', scripture: 'DG', source: 'D', startAng: 404, endAng: 428, category: 'Major Compositions', description: 'Persian tales of moral wisdom and justice by Guru Gobind Singh Ji.' },

  // ── Browse-Only Sources ────────────────────────────────────────────────────
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', scripture: 'BGV', source: 'B', startAng: 1, endAng: 628, category: 'Vars', description: 'Poetic vars by Bhai Gurdas Ji elucidating Sikh philosophy and history.', type: 'browse-only' },
  { id: 'amrit-keertan', name: 'Amrit Keertan', scripture: 'AK', source: 'A', startAng: 1, endAng: 1430, category: 'Keertan', description: 'Compilation of shabads from various scriptures selected for congregational singing.', type: 'browse-only' },
]

export const SGGS_CATEGORY_ORDER = ['Daily Prayers', 'Long Compositions', 'Vars', 'Saloks & Short Banis'] as const
export const DG_CATEGORY_ORDER = ['Daily Prayers', 'Bir Ras', 'Major Compositions', 'Shorter Banis'] as const
