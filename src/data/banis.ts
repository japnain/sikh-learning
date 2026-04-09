export interface Bani {
  id: string
  name: string
  scripture: 'SGGS' | 'DG' | 'BGV' | 'AK'
  source: 'G' | 'D' | 'B' | 'A'
  startAng: number
  endAng: number
  startVerseId?: number
  category: string
  description: string
  type?: 'browse-only'
  baniDbId?: number
  variantOf?: string
  variantLabel?: string
}

function exactBani(bani: Omit<Bani, 'type'> & { baniDbId: number }): Bani {
  return bani
}

function browseOnlyBani(bani: Omit<Bani, 'baniDbId'> & { type: 'browse-only' }): Bani {
  return bani
}

const EXACT_SGGS_BANIS: Bani[] = [
  exactBani({ id: 'japji-sahib', name: 'Japji Sahib', scripture: 'SGGS', source: 'G', startAng: 1, endAng: 8, category: 'Daily Prayers', description: 'Opening bani of Sri Guru Granth Sahib Ji recited at amrit vela.', baniDbId: 2 }),
  exactBani({ id: 'sodar', name: 'Sodar', scripture: 'SGGS', source: 'G', startAng: 8, endAng: 8, startVerseId: 386, category: 'Daily Prayers', description: 'The So Dar section that opens Rehras Sahib.', baniDbId: 7 }),
  exactBani({ id: 'rehras-sahib', name: 'Rehras Sahib', scripture: 'SGGS', source: 'G', startAng: 8, endAng: 12, startVerseId: 386, category: 'Daily Prayers', description: 'Evening Nitnem composition with adjustable STTM length support.', baniDbId: 21 }),
  exactBani({ id: 'kirtan-sohila', name: 'Kirtan Sohila', scripture: 'SGGS', source: 'G', startAng: 12, endAng: 13, startVerseId: 534, category: 'Daily Prayers', description: 'Night prayer recited before sleep.', baniDbId: 23 }),
  exactBani({ id: 'anand-sahib', name: 'Anand Sahib', scripture: 'SGGS', source: 'G', startAng: 917, endAng: 922, startVerseId: 39128, category: 'Daily Prayers', description: 'Bani of bliss by Guru Amar Das Ji.', baniDbId: 10 }),

  exactBani({ id: 'barah-maha-majh', name: 'Barah Maha (Majh)', scripture: 'SGGS', source: 'G', startAng: 133, endAng: 136, category: 'Long Compositions', description: 'The soul\'s longing through the twelve months in Majh raag.', baniDbId: 27 }),
  exactBani({ id: 'bavan-akhri', name: 'Bavan Akhri', scripture: 'SGGS', source: 'G', startAng: 250, endAng: 262, category: 'Long Compositions', description: 'Acrostic bani covering the Gurmukhi letters.', baniDbId: 33 }),
  exactBani({ id: 'sukhmani-sahib', name: 'Sukhmani Sahib', scripture: 'SGGS', source: 'G', startAng: 262, endAng: 296, startVerseId: 11494, category: 'Long Compositions', description: 'Pearl of peace by Guru Arjan Dev Ji.', baniDbId: 31 }),
  exactBani({ id: 'asa-di-var', name: 'Asa Di Var', scripture: 'SGGS', source: 'G', startAng: 462, endAng: 475, startVerseId: 20756, category: 'Long Compositions', description: 'Morning ballad traditionally sung in Asa raag.', baniDbId: 90 }),
  exactBani({ id: 'ghorian', name: 'Ghorian', scripture: 'SGGS', source: 'G', startAng: 573, endAng: 577, category: 'Long Compositions', description: 'Wedding songs on the soul\'s union with the Divine.', baniDbId: 40 }),
  exactBani({ id: 'onkar', name: 'Onkar', scripture: 'SGGS', source: 'G', startAng: 929, endAng: 938, category: 'Long Compositions', description: 'Guru Nanak Dev Ji\'s reflection on the One Creator.', baniDbId: 35 }),
  exactBani({ id: 'sidh-gosht', name: 'Sidh Gosht', scripture: 'SGGS', source: 'G', startAng: 938, endAng: 946, category: 'Long Compositions', description: 'Dialogue between Guru Nanak Dev Ji and the Siddhas.', baniDbId: 34 }),

  exactBani({ id: 'sri-raag-ki-vaar', name: 'Sri Raag Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 83, endAng: 91, category: 'Vars', description: 'Vaar within Sri Raag.', baniDbId: 86 }),
  exactBani({ id: 'var-majh', name: 'Vaar Manjh Ki', scripture: 'SGGS', source: 'G', startAng: 137, endAng: 150, category: 'Vars', description: 'Vaar in Majh raag by Guru Nanak Dev Ji.', baniDbId: 87 }),
  exactBani({ id: 'gauri-ki-vaar-m4', name: 'Gauri Ki Vaar M4', scripture: 'SGGS', source: 'G', startAng: 300, endAng: 317, category: 'Vars', description: 'Vaar in Gauri raag associated with Guru Ram Das Ji.', baniDbId: 88 }),
  exactBani({ id: 'gauri-ki-vaar-m5', name: 'Gauri Ki Vaar M5', scripture: 'SGGS', source: 'G', startAng: 318, endAng: 323, category: 'Vars', description: 'Vaar in Gauri raag associated with Guru Arjan Dev Ji.', baniDbId: 89 }),
  exactBani({ id: 'var-gujri', name: 'Gujari Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 508, endAng: 517, category: 'Vars', description: 'Vaar in Gujari raag.', baniDbId: 91 }),
  exactBani({ id: 'bihagare-ki-vaar', name: 'Bihagare Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 548, endAng: 556, category: 'Vars', description: 'Vaar in Bihagara raag.', baniDbId: 93 }),
  exactBani({ id: 'var-vadahans', name: 'Vadahans Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 585, endAng: 594, category: 'Vars', description: 'Vaar in Vadahans raag.', baniDbId: 94 }),
  exactBani({ id: 'var-sorath', name: 'Sorath Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 642, endAng: 654, category: 'Vars', description: 'Vaar in Sorath raag.', baniDbId: 95 }),
  exactBani({ id: 'jaitsri-vaar-m5', name: 'Jaitsri M5 Vaar Saloka Naal', scripture: 'SGGS', source: 'G', startAng: 705, endAng: 710, category: 'Vars', description: 'Jaitsri vaar with saloks.', baniDbId: 96 }),
  exactBani({ id: 'var-suhi', name: 'Vaar Suhi Ki', scripture: 'SGGS', source: 'G', startAng: 785, endAng: 792, category: 'Vars', description: 'Vaar in Suhi raag.', baniDbId: 97 }),
  exactBani({ id: 'var-bilaval', name: 'Bilaval Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 849, endAng: 855, category: 'Vars', description: 'Vaar in Bilaval raag.', baniDbId: 98 }),
  exactBani({ id: 'var-ramkali-m3', name: 'Ramkali Ki Vaar M3', scripture: 'SGGS', source: 'G', startAng: 947, endAng: 956, category: 'Vars', description: 'Ramkali vaar linked with Guru Amar Das Ji.', baniDbId: 99 }),
  exactBani({ id: 'var-ramkali-m5', name: 'Ramkali Ki Vaar M5', scripture: 'SGGS', source: 'G', startAng: 957, endAng: 966, category: 'Vars', description: 'Ramkali vaar linked with Guru Arjan Dev Ji.', baniDbId: 100 }),
  exactBani({ id: 'var-ramkali-rai-balvand', name: 'Ramkali Ki Vaar Rai Balvand', scripture: 'SGGS', source: 'G', startAng: 966, endAng: 968, category: 'Vars', description: 'The Rai Balvand and Satta ramkali vaar.', baniDbId: 101 }),
  exactBani({ id: 'var-maru', name: 'Maru Vaar M3', scripture: 'SGGS', source: 'G', startAng: 1086, endAng: 1094, category: 'Vars', description: 'Maru vaar linked with Guru Amar Das Ji.', baniDbId: 102 }),
  exactBani({ id: 'basant-ki-vaar', name: 'Basant Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 1193, endAng: 1193, category: 'Vars', description: 'Single-ang vaar in Basant raag.', baniDbId: 104 }),
  exactBani({ id: 'var-sarang', name: 'Sarang Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 1237, endAng: 1251, category: 'Vars', description: 'Vaar in Sarang raag.', baniDbId: 105 }),
  exactBani({ id: 'var-mallar', name: 'Vaar Mallar Ki', scripture: 'SGGS', source: 'G', startAng: 1278, endAng: 1291, category: 'Vars', description: 'Vaar in Mallar raag.', baniDbId: 106 }),
  exactBani({ id: 'kanare-ki-vaar', name: 'Kanare Ki Vaar', scripture: 'SGGS', source: 'G', startAng: 1312, endAng: 1318, category: 'Vars', description: 'Vaar in Kanara raag.', baniDbId: 107 }),

  exactBani({ id: 'dukh-bhanjani', name: 'Dukh Bhanjani Sahib', scripture: 'SGGS', source: 'G', startAng: 218, endAng: 220, category: 'Saloks & Short Banis', description: 'Healing bani often read for comfort and recovery.', baniDbId: 36 }),
  exactBani({ id: 'thiiti-majh', name: 'Thiiti (Majh)', scripture: 'SGGS', source: 'G', startAng: 296, endAng: 300, category: 'Saloks & Short Banis', description: 'Lunar-calendar composition in Majh raag.', baniDbId: 49 }),
  exactBani({ id: 'birhade', name: 'Birhade', scripture: 'SGGS', source: 'G', startAng: 557, endAng: 558, category: 'Saloks & Short Banis', description: 'Short songs of longing and separation.', baniDbId: 42 }),
  exactBani({ id: 'aarti', name: 'Aarti', scripture: 'SGGS', source: 'G', startAng: 663, endAng: 663, startVerseId: 28685, category: 'Saloks & Short Banis', description: 'Guru Nanak Dev Ji\'s cosmic aarti.', baniDbId: 22 }),
  exactBani({ id: 'laavan', name: 'Laavan', scripture: 'SGGS', source: 'G', startAng: 773, endAng: 774, startVerseId: 32936, category: 'Saloks & Short Banis', description: 'The four laavaan of Anand Karaj.', baniDbId: 11 }),
  exactBani({ id: 'ramkali-sadd', name: 'Ramkali Sadd', scripture: 'SGGS', source: 'G', startAng: 923, endAng: 924, category: 'Saloks & Short Banis', description: 'Short Ramkali composition on spiritual departure.', baniDbId: 46 }),
  exactBani({ id: 'funehe', name: 'Funehe Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 1361, endAng: 1363, category: 'Saloks & Short Banis', description: 'Short poetic composition by Guru Arjan Dev Ji.', baniDbId: 17 }),
  exactBani({ id: 'choubole', name: 'Choubole Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 1363, endAng: 1364, category: 'Saloks & Short Banis', description: 'Four-line verses by Guru Arjan Dev Ji.', baniDbId: 18 }),
  exactBani({ id: 'salok-bhagat-kabir', name: 'Salok Bhagat Kabir Jio Ke', scripture: 'SGGS', source: 'G', startAng: 1364, endAng: 1377, category: 'Saloks & Short Banis', description: 'Kabir Ji\'s saloks collected in SGGS.', baniDbId: 77 }),
  exactBani({ id: 'salok-farid', name: 'Salok Sheikh Farid Ji', scripture: 'SGGS', source: 'G', startAng: 1377, endAng: 1385, category: 'Saloks & Short Banis', description: 'Sheikh Farid Ji\'s saloks collected in SGGS.', baniDbId: 78 }),
  exactBani({ id: 'salok-mahalla-9', name: 'Salok Mahalla 9', scripture: 'SGGS', source: 'G', startAng: 1426, endAng: 1429, startVerseId: 60214, category: 'Saloks & Short Banis', description: 'Saloks of Guru Tegh Bahadur Ji.', baniDbId: 30 }),
  exactBani({ id: 'raag-maala', name: 'Raag Maala', scripture: 'SGGS', source: 'G', startAng: 1429, endAng: 1430, category: 'Saloks & Short Banis', description: 'Closing raag garland at the end of SGGS.', baniDbId: 38 }),
]

const EXACT_DG_BANIS: Bani[] = [
  exactBani({ id: 'jaap-sahib', name: 'Jaap Sahib', scripture: 'DG', source: 'D', startAng: 1, endAng: 10, category: 'Daily Prayers', description: 'Morning Nitnem bani by Guru Gobind Singh Ji.', baniDbId: 4 }),
  exactBani({ id: 'tav-prasad-savaiye', name: 'Tav Prasad Savaiye', scripture: 'DG', source: 'D', startAng: 10, endAng: 10, startVerseId: 74956, category: 'Daily Prayers', description: 'Nitnem swaiyas rejecting empty ritual.', baniDbId: 6, variantLabel: 'Sraavag Suddh' }),
  exactBani({ id: 'chaupai-sahib', name: 'Chaupai Sahib', scripture: 'DG', source: 'D', startAng: 1386, endAng: 1388, category: 'Daily Prayers', description: 'Benati Chaupai Sahib with adjustable STTM length support.', baniDbId: 9 }),

  exactBani({ id: 'ugardanti', name: 'Ugardanti', scripture: 'DG', source: 'D', startAng: 55, endAng: 64, category: 'Bir Ras', description: 'Fierce devotional composition invoking the Divine protector.', baniDbId: 53 }),
  exactBani({ id: 'vaar-sri-bhagauti-ji-ki', name: 'Vaar Sri Bhagauti Ji Ki', scripture: 'DG', source: 'D', startAng: 119, endAng: 127, category: 'Bir Ras', description: 'Also known as Chandi Di Vaar.', baniDbId: 13 }),

  exactBani({ id: 'akal-ustat', name: 'Akal Ustat', scripture: 'DG', source: 'D', startAng: 11, endAng: 38, category: 'Major Compositions', description: 'Praise of the Timeless One.', baniDbId: 29 }),
  exactBani({ id: 'zafarnama', name: 'Zafarnama', scripture: 'DG', source: 'D', startAng: 1389, endAng: 1389, category: 'Major Compositions', description: 'Guru Gobind Singh Ji\'s Persian letter to Aurangzeb.', baniDbId: 98 }),

  exactBani({ id: 'shabad-hazare-10', name: 'Shabad Hazare Patshahi 10', scripture: 'DG', source: 'D', startAng: 709, endAng: 712, category: 'Shorter Banis', description: 'Shabads of longing and love by Guru Gobind Singh Ji.', baniDbId: 5 }),
  exactBani({ id: 'sastra-naam-mala', name: 'Shastar Naam Mala', scripture: 'DG', source: 'D', startAng: 717, endAng: 809, category: 'Shorter Banis', description: 'Meditation through the names of weapons.', baniDbId: 19 }),
]

const READ_ONLY_SGGS_EXACT_BANIS: Bani[] = [
  exactBani({ id: 'gur-mantar', name: 'Gur Mantar', scripture: 'SGGS', source: 'G', startAng: 13, endAng: 13, category: 'Saloks & Short Banis', description: 'Short foundational mantra at the start of SGGS reading.', baniDbId: 1 }),
  exactBani({ id: 'shabad-hazare', name: 'Shabad Hazare', scripture: 'SGGS', source: 'G', startAng: 96, endAng: 795, category: 'Long Compositions', description: 'Collected Shabad Hazare composition served as one exact BaniDB bani.', baniDbId: 3 }),
  exactBani({ id: 'kuchji', name: 'Kuchji', scripture: 'SGGS', source: 'G', startAng: 762, endAng: 762, category: 'Saloks & Short Banis', description: 'Short bani traditionally grouped with wedding and union imagery.', baniDbId: 14 }),
  exactBani({ id: 'suchji', name: 'Suchji', scripture: 'SGGS', source: 'G', startAng: 762, endAng: 762, category: 'Saloks & Short Banis', description: 'Short bani traditionally paired with Kuchji.', baniDbId: 15 }),
  exactBani({ id: 'gunvanti', name: 'Gunvanti', scripture: 'SGGS', source: 'G', startAng: 763, endAng: 763, category: 'Saloks & Short Banis', description: 'Short composition on spiritual worthiness and virtue.', baniDbId: 16 }),
  exactBani({ id: 'sukhmana-sahib', name: 'Sukhmana Sahib', scripture: 'SGGS', source: 'G', startAng: 833, endAng: 1326, category: 'Long Compositions', description: 'Exact BaniDB Sukhmana Sahib composition.', baniDbId: 32 }),
  exactBani({ id: 'bavan-akhri-kabir', name: 'Bavan Akhri Kabir Ji', scripture: 'SGGS', source: 'G', startAng: 340, endAng: 343, category: 'Long Compositions', description: 'Bavan Akhri composition of Bhagat Kabir Ji.', baniDbId: 39 }),
  exactBani({ id: 'karhale', name: 'Karhale', scripture: 'SGGS', source: 'G', startAng: 234, endAng: 234, category: 'Saloks & Short Banis', description: 'Compact SGGS composition served as its own exact bani.', baniDbId: 41 }),
  exactBani({ id: 'patti-likhi', name: 'Patti Likhi', scripture: 'SGGS', source: 'G', startAng: 432, endAng: 434, category: 'Saloks & Short Banis', description: 'Alphabet-based teaching composition.', baniDbId: 43 }),
  exactBani({ id: 'patti-mahalla-3', name: 'Patti Mahalla 3', scripture: 'SGGS', source: 'G', startAng: 434, endAng: 435, category: 'Saloks & Short Banis', description: 'Patti composition from Guru Amar Das Ji.', baniDbId: 44 }),
  exactBani({ id: 'ruti-mahalla-5', name: 'Ruti Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 927, endAng: 929, category: 'Saloks & Short Banis', description: 'Seasonal composition from Guru Arjan Dev Ji.', baniDbId: 45 }),
  exactBani({ id: 'thitanti-kabir', name: 'Thitanti Kabir Ji', scripture: 'SGGS', source: 'G', startAng: 343, endAng: 344, category: 'Saloks & Short Banis', description: 'Thitanti composition of Bhagat Kabir Ji.', baniDbId: 47 }),
  exactBani({ id: 'thiti-mahalla-1', name: 'Thiti Mahalla 1', scripture: 'SGGS', source: 'G', startAng: 838, endAng: 840, category: 'Saloks & Short Banis', description: 'Thiti composition from Guru Nanak Dev Ji.', baniDbId: 48 }),
  exactBani({ id: 'gauri-vaar-kabir', name: 'Gauri Vaar Kabir Ji', scripture: 'SGGS', source: 'G', startAng: 344, endAng: 345, category: 'Vars', description: 'Vaar of Bhagat Kabir Ji in Gauri.', baniDbId: 50 }),
  exactBani({ id: 'bilaval-mahalla-3-vaar-sat', name: 'Bilaval Mahalla 3 Vaar Sat', scripture: 'SGGS', source: 'G', startAng: 841, endAng: 842, category: 'Vars', description: 'Bilaval vaar composition linked with Guru Amar Das Ji.', baniDbId: 51 }),
  exactBani({ id: 'vanjara', name: 'Vanjara', scripture: 'SGGS', source: 'G', startAng: 81, endAng: 82, category: 'Saloks & Short Banis', description: 'Compact SGGS bani on the trader-soul metaphor.', baniDbId: 52 }),

  exactBani({ id: 'raag-siri-raag-kabir', name: 'Raag Siri Raag (Kabir Ji Ka)', scripture: 'SGGS', source: 'G', startAng: 91, endAng: 93, category: 'Raag Sections', description: 'Exact BaniDB raag section for Kabir Ji in Siri Raag.', baniDbId: 55 }),
  exactBani({ id: 'raag-gauri', name: 'Raag Gauri', scripture: 'SGGS', source: 'G', startAng: 323, endAng: 346, category: 'Raag Sections', description: 'Exact BaniDB raag section for Gauri.', baniDbId: 56 }),
  exactBani({ id: 'raag-asa', name: 'Raag Asa', scripture: 'SGGS', source: 'G', startAng: 475, endAng: 488, category: 'Raag Sections', description: 'Exact BaniDB raag section for Asa.', baniDbId: 57 }),
  exactBani({ id: 'raag-gujri', name: 'Raag Gujri', scripture: 'SGGS', source: 'G', startAng: 524, endAng: 526, category: 'Raag Sections', description: 'Exact BaniDB raag section for Gujri.', baniDbId: 58 }),
  exactBani({ id: 'raag-sorath', name: 'Raag Sorath', scripture: 'SGGS', source: 'G', startAng: 654, endAng: 659, category: 'Raag Sections', description: 'Exact BaniDB raag section for Sorath.', baniDbId: 59 }),
  exactBani({ id: 'raag-dhanasri', name: 'Raag Dhanasri', scripture: 'SGGS', source: 'G', startAng: 691, endAng: 695, category: 'Raag Sections', description: 'Exact BaniDB raag section for Dhanasri.', baniDbId: 60 }),
  exactBani({ id: 'raag-jaitsri', name: 'Raag Jaitsri', scripture: 'SGGS', source: 'G', startAng: 710, endAng: 710, category: 'Raag Sections', description: 'Exact BaniDB raag section for Jaitsri.', baniDbId: 61 }),
  exactBani({ id: 'raag-todi-bhagat', name: 'Raag Todi (Bhagat Bani)', scripture: 'SGGS', source: 'G', startAng: 718, endAng: 718, category: 'Raag Sections', description: 'Exact BaniDB raag section for Bhagat bani in Todi.', baniDbId: 62 }),
  exactBani({ id: 'raag-tilang-kabir', name: 'Raag Tilang (Kabir Ji)', scripture: 'SGGS', source: 'G', startAng: 727, endAng: 727, category: 'Raag Sections', description: 'Exact BaniDB raag section for Kabir Ji in Tilang.', baniDbId: 63 }),
  exactBani({ id: 'raag-suhi', name: 'Raag Suhi', scripture: 'SGGS', source: 'G', startAng: 792, endAng: 794, category: 'Raag Sections', description: 'Exact BaniDB raag section for Suhi.', baniDbId: 64 }),
  exactBani({ id: 'raag-bilaval', name: 'Raag Bilaval', scripture: 'SGGS', source: 'G', startAng: 855, endAng: 858, category: 'Raag Sections', description: 'Exact BaniDB raag section for Bilaval.', baniDbId: 65 }),
  exactBani({ id: 'raag-gond', name: 'Raag Gond', scripture: 'SGGS', source: 'G', startAng: 870, endAng: 875, category: 'Raag Sections', description: 'Exact BaniDB raag section for Gond.', baniDbId: 66 }),
  exactBani({ id: 'raag-ramkali-sadd', name: 'Raag Ramkali (Sadd)', scripture: 'SGGS', source: 'G', startAng: 923, endAng: 974, category: 'Raag Sections', description: 'Exact BaniDB Ramkali section keyed around Sadd.', baniDbId: 67 }),
  exactBani({ id: 'raag-mali-gaura', name: 'Raag Mali Gaura', scripture: 'SGGS', source: 'G', startAng: 988, endAng: 988, category: 'Raag Sections', description: 'Exact BaniDB raag section for Mali Gaura.', baniDbId: 68 }),
  exactBani({ id: 'raag-maru', name: 'Raag Maru', scripture: 'SGGS', source: 'G', startAng: 1102, endAng: 1106, category: 'Raag Sections', description: 'Exact BaniDB raag section for Maru.', baniDbId: 69 }),
  exactBani({ id: 'raag-kedara', name: 'Raag Kedara', scripture: 'SGGS', source: 'G', startAng: 1123, endAng: 1124, category: 'Raag Sections', description: 'Exact BaniDB raag section for Kedara.', baniDbId: 70 }),
  exactBani({ id: 'raag-bhairao', name: 'Raag Bhairao', scripture: 'SGGS', source: 'G', startAng: 1157, endAng: 1167, category: 'Raag Sections', description: 'Exact BaniDB raag section for Bhairao.', baniDbId: 71 }),
  exactBani({ id: 'raag-basant', name: 'Raag Basant', scripture: 'SGGS', source: 'G', startAng: 1193, endAng: 1196, category: 'Raag Sections', description: 'Exact BaniDB raag section for Basant.', baniDbId: 72 }),
  exactBani({ id: 'raag-sarang', name: 'Raag Sarang', scripture: 'SGGS', source: 'G', startAng: 1251, endAng: 1253, category: 'Raag Sections', description: 'Exact BaniDB raag section for Sarang.', baniDbId: 73 }),
  exactBani({ id: 'raag-malaar', name: 'Raag Malaar', scripture: 'SGGS', source: 'G', startAng: 1292, endAng: 1293, category: 'Raag Sections', description: 'Exact BaniDB raag section for Malaar.', baniDbId: 74 }),
  exactBani({ id: 'raag-kanara', name: 'Raag Kanara', scripture: 'SGGS', source: 'G', startAng: 1318, endAng: 1318, category: 'Raag Sections', description: 'Exact BaniDB raag section for Kanara.', baniDbId: 75 }),
  exactBani({ id: 'raag-prabhati', name: 'Raag Prabhati', scripture: 'SGGS', source: 'G', startAng: 1349, endAng: 1351, category: 'Raag Sections', description: 'Exact BaniDB raag section for Prabhati.', baniDbId: 76 }),

  exactBani({ id: 'savaiye-sri-mukhbaak-m5-1', name: 'Savaiye Sri Mukhbaak Mahalla 5 - 1', scripture: 'SGGS', source: 'G', startAng: 1385, endAng: 1387, category: 'Swaiye', description: 'First exact Savaiye cluster of Guru Arjan Dev Ji.', baniDbId: 79 }),
  exactBani({ id: 'savaiye-sri-mukhbaak-m5-2', name: 'Savaiye Sri Mukhbaak Mahalla 5 - 2', scripture: 'SGGS', source: 'G', startAng: 1387, endAng: 1389, category: 'Swaiye', description: 'Second exact Savaiye cluster of Guru Arjan Dev Ji.', baniDbId: 80 }),
  exactBani({ id: 'savaiye-mahalla-1', name: 'Savaiye Mahalla 1', scripture: 'SGGS', source: 'G', startAng: 1389, endAng: 1390, category: 'Swaiye', description: 'Exact Savaiye set of Guru Nanak Dev Ji.', baniDbId: 81 }),
  exactBani({ id: 'savaiye-mahalla-2', name: 'Savaiye Mahalla 2', scripture: 'SGGS', source: 'G', startAng: 1391, endAng: 1392, category: 'Swaiye', description: 'Exact Savaiye set of Guru Angad Dev Ji.', baniDbId: 82 }),
  exactBani({ id: 'savaiye-mahalla-3', name: 'Savaiye Mahalla 3', scripture: 'SGGS', source: 'G', startAng: 1392, endAng: 1396, category: 'Swaiye', description: 'Exact Savaiye set of Guru Amar Das Ji.', baniDbId: 83 }),
  exactBani({ id: 'savaiye-mahalla-4', name: 'Savaiye Mahalla 4', scripture: 'SGGS', source: 'G', startAng: 1396, endAng: 1406, category: 'Swaiye', description: 'Exact Savaiye set of Guru Ram Das Ji.', baniDbId: 84 }),
  exactBani({ id: 'savaiye-mahalla-5', name: 'Savaiye Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 1406, endAng: 1409, category: 'Swaiye', description: 'Exact Savaiye set of Guru Arjan Dev Ji.', baniDbId: 85 }),

  exactBani({ id: 'gujari-vaar-mahalla-5', name: 'Gujari Vaar Mahalla 5', scripture: 'SGGS', source: 'G', startAng: 517, endAng: 524, category: 'Vars', description: 'Exact Gujari vaar composition of Guru Arjan Dev Ji.', baniDbId: 92 }),
  exactBani({ id: 'maru-vaar-mahalla-5-dakhane', name: 'Maru Vaar Mahalla 5 Dakhane', scripture: 'SGGS', source: 'G', startAng: 1094, endAng: 1102, category: 'Vars', description: 'Exact Maru vaar with dakhane of Guru Arjan Dev Ji.', baniDbId: 103 }),
]

const READ_ONLY_DG_EXACT_BANIS: Bani[] = [
  exactBani({ id: 'tav-prasad-savaiye-dinan-ki', name: 'Tav Prasad Savaiye (Dheenan Ki)', scripture: 'DG', source: 'D', startAng: 11, endAng: 37, category: 'Daily Prayers', description: 'The Dheenan Ki exact BaniDB variant of Tav Prasad Savaiye.', baniDbId: 7, variantOf: 'tav-prasad-savaiye', variantLabel: 'Dheenan Ki' }),
  exactBani({ id: 'akal-ustat-chaupai', name: 'Akal Ustat Chaupai', scripture: 'DG', source: 'D', startAng: 11, endAng: 11, category: 'Supplemental Banis', description: 'Short chaupai section drawn from Akal Ustat.', baniDbId: 8 }),
  exactBani({ id: 'sri-bhagauti-astotr', name: 'Sri Bhagauti Astotr', scripture: 'DG', source: 'D', startAng: 1428, endAng: 1428, category: 'Supplemental Banis', description: 'Panth Prakash exact BaniDB variant of Sri Bhagauti Astotr.', baniDbId: 25, variantLabel: 'Panth Prakash' }),
  exactBani({ id: 'sri-bhagauti-astotr-hazur-sahib', name: 'Sri Bhagauti Astotr (Hazur Sahib)', scripture: 'DG', source: 'D', startAng: 1428, endAng: 1428, category: 'Supplemental Banis', description: 'Hazur Sahib exact BaniDB variant of Sri Bhagauti Astotr.', baniDbId: 26, variantOf: 'sri-bhagauti-astotr', variantLabel: 'Hazur Sahib' }),
  exactBani({ id: 'ath-chandi-charitar', name: 'Ath Chandi Charitar', scripture: 'DG', source: 'D', startAng: 119, endAng: 119, category: 'Bir Ras', description: 'Compact Chandi Charitar composition served as its own exact bani.', baniDbId: 12 }),
  exactBani({ id: 'barah-maha-savaiyaa', name: 'Barah Maha Savaiyaa', scripture: 'DG', source: 'D', startAng: 383, endAng: 384, category: 'Shorter Banis', description: 'Exact Dasam composition on the twelve months in savaiyaa form.', baniDbId: 28 }),
]

const BROWSE_ONLY_BANIS: Bani[] = [
  browseOnlyBani({ id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', scripture: 'BGV', source: 'B', startAng: 1, endAng: 628, category: 'Vars', description: 'Poetic vaaran by Bhai Gurdas Ji.', type: 'browse-only' }),
  browseOnlyBani({ id: 'amrit-keertan', name: 'Amrit Keertan', scripture: 'AK', source: 'A', startAng: 1, endAng: 1430, category: 'Keertan', description: 'Songbook-style shabad collection for keertan.', type: 'browse-only' }),
]

export const BANIS: Bani[] = [
  ...EXACT_SGGS_BANIS,
  ...EXACT_DG_BANIS,
  ...BROWSE_ONLY_BANIS,
]

export const READ_EXACT_SGGS_BANIS: Bani[] = [
  ...EXACT_SGGS_BANIS,
  ...READ_ONLY_SGGS_EXACT_BANIS,
]

export const READ_EXACT_DG_BANIS: Bani[] = [
  ...EXACT_DG_BANIS,
  ...READ_ONLY_DG_EXACT_BANIS,
]

export const READ_EXACT_BANIS: Bani[] = [
  ...READ_EXACT_SGGS_BANIS,
  ...READ_EXACT_DG_BANIS,
]

export const SGGS_CATEGORY_ORDER = ['Daily Prayers', 'Long Compositions', 'Vars', 'Raag Sections', 'Saloks & Short Banis', 'Swaiye'] as const
export const DG_CATEGORY_ORDER = ['Daily Prayers', 'Bir Ras', 'Major Compositions', 'Supplemental Banis', 'Shorter Banis'] as const
