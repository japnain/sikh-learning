import type { BaniDiscoveryEntries } from './baniDiscoveryTypes'

const ang = (page: number) => ({
  label: `Guru Granth Sahib, Ang ${page} (SriGranth)`,
  url: `https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=${page}`,
})

const sevenDays = {
  label: 'The Guru Granth Sahib Project: the Seven Days poetic form',
  url: 'https://gurugranthsahib.io/bani/introduction/93/Introduction',
}

// A Vaar's heading identifies its principal author; accompanying saloks may
// belong to other Gurus. The weekday compositions 50/51 are a different form.
export const VAAR_BANI_DISCOVERY = {
  50: {
    name: 'Seven Days in Gauri (Bhagat Kabir Ji)',
    summary: 'Bhagat Kabir Ji uses the seven weekdays to encourage daily praise and remembrance of the Divine in this Gauri composition.',
    detail: 'Also called Gauri Vaar Kabir Ji, this is a Seven Days poem, distinct from the ballad form of the twenty-two Vaars; its refrain calls for repeated praise of the Divine.',
    references: [ang(344), sevenDays],
  },
  51: {
    name: 'Seven Days in Bilaval (Guru Amar Das Ji)',
    summary: 'Guru Amar Das Ji uses the weekdays as a framework for remembering the Divine presence and finding peace through the Name.',
    detail: 'The heading Vaar Sat means Seven Days here; it is distinct from Guru Ram Das Ji’s Bilaval Vaar beginning on Ang 849.',
    references: [ang(841), ang(849), sevenDays],
  },
  86: {
    name: 'Sri Raag Vaar',
    summary: 'Guru Ram Das Ji’s Sri Raag Vaar opens with saloks connecting love of truth with reflection on the Guru’s word.',
    detail: 'The heading names the Fourth Guru, while the opening saloks are by Guru Amar Das Ji; a Vaar is a ballad-like poetic form built from pauris, or stanzas.',
    references: [ang(83), {
      label: 'The Guru Granth Sahib Dictionary: Vaar',
      url: 'https://gurugranthsahibdictionary.io/dictionary/english/glossary/V',
    }],
  },
  87: {
    name: 'Majh Vaar',
    summary: 'Guru Nanak Dev Ji’s Majh Vaar opens by praising the Guru as a source of light and peace, then examines changing human attachments.',
    detail: 'Its heading specifies the tune associated with Malik Murid and Chandrahara Sohiya. This reading also includes Guru Nanak Dev Ji’s following Gauri Guareri hymn on Ang 151, after the Majh Vaar ends.',
    references: [ang(137), ang(151), {
      label: 'Selected reading · BaniDB',
      url: 'https://api.banidb.com/v2/banis/87',
    }],
  },
  88: {
    name: 'Gauri Vaar (Guru Ram Das Ji)',
    summary: 'Guru Ram Das Ji’s Gauri Vaar opens with the True Guru’s equal regard for everyone and the importance of sincere devotion.',
    detail: 'This is the Fourth Guru’s Gauri Vaar, distinct from the Fifth Guru’s composition of the same raag beginning on Ang 318.',
    references: [ang(300), ang(318)],
  },
  89: {
    name: 'Gauri Vaar (Guru Arjan Dev Ji)',
    summary: 'Guru Arjan Dev Ji’s Gauri Vaar opens with remembrance of the Divine Name and spiritual company as support through suffering.',
    detail: 'The heading identifies the Fifth Guru and specifies the tune of Rai Kamaldi-Mojdi; this is a separate composition from Guru Ram Das Ji’s Gauri Vaar.',
    references: [ang(318), ang(300)],
  },
  90: {
    name: 'Asa Di Vaar',
    summary: 'Guru Nanak Dev Ji’s Asa Vaar joins pauris and saloks in reflection on the Guru’s guidance and the Divine present throughout creation.',
    detail: 'Also called Asa Ki Vaar, this morning reading includes the accompanying Asa chhants of Guru Ram Das Ji; the Vaar’s heading specifies the tune of Tunda Asraj.',
    references: [ang(462), {
      label: 'The Guru Granth Sahib Project: Asa Ki Var, first pauri',
      url: 'https://gurugranthsahib.io/bani/details/AKV/1/5',
    }, {
      label: 'The Guru Granth Sahib Project: Asa Ki Var singing tradition',
      url: 'https://gurugranthsahib.io/bani/introduction/104/MusicalDimension',
    }],
  },
  91: {
    name: 'Gujari Vaar (Guru Amar Das Ji)',
    summary: 'Guru Amar Das Ji’s Gujari Vaar contrasts possessive attachment with a life guided by the Guru and remembrance of the Divine.',
    detail: 'Its heading specifies the tune of Sikandar and Birahim; Guru Arjan Dev Ji’s Gujari Vaar is a separate composition beginning on Ang 517.',
    references: [ang(508), ang(517)],
  },
  92: {
    name: 'Gujari Vaar (Guru Arjan Dev Ji)',
    summary: 'Guru Arjan Dev Ji’s Gujari Vaar opens with a call to remember the Guru inwardly, in speech, in seeing and in listening.',
    detail: 'The heading identifies the Fifth Guru, distinguishing this composition from the Third Guru’s Gujari Vaar earlier in the same raag.',
    references: [ang(517), ang(508)],
  },
  93: {
    name: 'Bihagara Vaar',
    summary: 'Guru Ram Das Ji’s Bihagara Vaar opens with saloks on finding peace through serving the Guru and receiving the Divine Name.',
    detail: 'The Vaar is attributed to the Fourth Guru in its heading, while its first saloks are by Guru Amar Das Ji.',
    references: [ang(548)],
  },
  94: {
    name: 'Vadhans Vaar',
    summary: 'Guru Ram Das Ji’s Vadhans Vaar opens with saloks that use swan imagery for those absorbed in the Guru’s word and the True Name.',
    detail: 'The heading gives the traditional tune of Lala-Bahlima; the opening saloks are by Guru Amar Das Ji.',
    references: [ang(585)],
  },
  95: {
    name: 'Sorath Vaar',
    summary: 'Guru Ram Das Ji’s Sorath Vaar opens with the image of a devoted bride to explore inner truth and love of the Divine.',
    detail: 'The heading names the Fourth Guru; its opening salok by Guru Nanak Dev Ji connects the beauty of Sorath with truth dwelling in the mind.',
    references: [ang(642)],
  },
  96: {
    name: 'Jaitsri Vaar',
    summary: 'Guru Arjan Dev Ji’s Jaitsri Vaar opens by affirming the Divine presence through all time and the value of remembrance.',
    detail: 'Its heading explicitly describes a Vaar with saloks, which accompany its pauris.',
    references: [ang(705)],
  },
  97: {
    name: 'Suhi Vaar',
    summary: 'Guru Amar Das Ji’s Suhi Vaar opens with bride imagery that contrasts devotion to the Divine with attachment and divided love.',
    detail: 'The heading identifies the Third Guru and describes the composition as a Vaar with saloks.',
    references: [ang(785)],
  },
  98: {
    name: 'Bilaval Vaar',
    summary: 'Guru Ram Das Ji’s Bilaval Vaar begins with praise and attention to the Guru’s teaching, picturing the renewed mind as a flourishing garden.',
    detail: 'This Fourth Guru Vaar is separate from Guru Amar Das Ji’s Seven Days composition in Bilaval on Ang 841.',
    references: [ang(849), ang(841)],
  },
  99: {
    name: 'Ramkali Vaar (Guru Amar Das Ji)',
    summary: 'Guru Amar Das Ji’s Ramkali Vaar opens with a field-and-seed image of the Guru’s wisdom, the Divine Name and freedom from ego.',
    detail: 'Its heading specifies the tune of Jodha and Vira Purbani; it is distinct from the Fifth Guru’s Ramkali Vaar and the Vaar of Satta and Balvand.',
    references: [ang(947), ang(957), ang(966)],
  },
  100: {
    name: 'Ramkali Vaar (Guru Arjan Dev Ji)',
    summary: 'Guru Arjan Dev Ji’s Ramkali Vaar opens by praising the Guru’s role in overcoming ego and reuniting the separated with the Divine.',
    detail: 'The heading identifies the Fifth Guru, distinguishing this from the other two Ramkali Vaars.',
    references: [ang(957), ang(947), ang(966)],
  },
  101: {
    name: 'Ramkali Vaar (Satta and Balvand)',
    summary: 'Satta and Balvand’s Ramkali Vaar celebrates the continuity of Guruship from Guru Nanak Dev Ji through Guru Arjan Dev Ji.',
    detail: 'Its heading names both contributors; the text also honours Mata Khivi and her generous langar service.',
    references: [ang(966), ang(967), ang(968)],
  },
  102: {
    name: 'Maru Vaar (Guru Amar Das Ji)',
    summary: 'Guru Amar Das Ji’s Maru Vaar opens with a salok that uses buying and selling to explore the recognition and worth of virtue.',
    detail: 'The opening salok is by Guru Nanak Dev Ji; this Third Guru Vaar is separate from the Fifth Guru’s Maru Vaar with dakhane.',
    references: [ang(1086), ang(1094)],
  },
  103: {
    name: 'Maru Vaar (Guru Arjan Dev Ji)',
    summary: 'Guru Arjan Dev Ji’s Maru Vaar pairs pauris with dakhane verses, beginning with devotion and longing for the Divine beloved.',
    detail: 'The heading names the Fifth Guru for both the Vaar and its dakhane; this is distinct from Guru Amar Das Ji’s Maru Vaar.',
    references: [ang(1094), ang(1086)],
  },
  104: {
    name: 'Basant Vaar',
    summary: 'Guru Arjan Dev Ji’s brief Basant Vaar uses spring and blossoming as images of renewal through the Divine Name and spiritual company.',
    detail: 'The composition begins on Ang 1193 with a call to remember the Divine Name and flourish inwardly.',
    references: [ang(1193)],
  },
  105: {
    name: 'Sarang Vaar',
    summary: 'Guru Ram Das Ji’s Sarang Vaar opens with saloks portraying the Guru as the key that unlocks attachment within the mind.',
    detail: 'Its heading specifies the tune of Rai Mehma-Hasna; the first salok is by Guru Angad Dev Ji.',
    references: [ang(1237)],
  },
  106: {
    name: 'Malhar Vaar',
    summary: 'Guru Nanak Dev Ji’s Malhar Vaar opens with a salok likening the joy of meeting the Guru to rain reviving the earth.',
    detail: 'The heading specifies the tune of Rana Kailash and Malda; its opening salok is by Guru Amar Das Ji.',
    references: [ang(1278)],
  },
  107: {
    name: 'Kanara Vaar',
    summary: 'Guru Ram Das Ji’s Kanara Vaar opens with a call to hold the Divine Name in the heart, practise humility and overcome ego.',
    detail: 'The heading identifies the Fourth Guru and specifies the tune of the Vaar of Musa.',
    references: [ang(1312)],
  },
} satisfies BaniDiscoveryEntries
