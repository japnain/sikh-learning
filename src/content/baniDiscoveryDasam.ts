import type { BaniDiscoveryEntries, BaniDiscoveryEntry } from './baniDiscoveryTypes'

const baniText = (id: number) => ({
  label: 'BaniDB: selected text and headings',
  url: `https://api.banidb.com/v2/banis/${id}`,
})

const rehatMaryada = {
  label: 'SGPC: Sikh Rehat Maryada',
  url: 'https://sgpc.net/wp-content/uploads/2025/06/Sikh-Rehat-Maryada-English-n.pdf',
}

const guruBiography = {
  label: 'SGPC: Guru Gobind Singh Ji and his writings',
  url: 'https://sgpc.net/ten-guru-sahibs/guru-gobind-singh-sahib/',
}

// These entries describe the selected text, not the full page span of a parent
// composition. In particular, 12 and 19 are excerpts, and 25/26 are distinct texts.
export const DASAM_BANI_DISCOVERY = {
  4: {
    name: 'Jaap Sahib',
    summary: 'Guru Gobind Singh Ji’s hymn of praise addresses the Divine beyond form, caste, birth and death through a succession of names and attributes.',
    detail: 'Its 199 stanzas are recited in morning Nitnem and during Amrit Sanchar, the Sikh initiation ceremony.',
    references: [baniText(4), rehatMaryada, guruBiography],
  },
  5: {
    name: 'Shabad Hazare (Patshahi 10)',
    summary: 'Ten hymns of Guru Gobind Singh Ji explore devotion to the One, inner discipline and longing for the Beloved.',
    detail: 'This collection includes the shabad Mitar Pyare Nu and is distinct from the Guru Granth Sahib selection also called Shabad Hazare.',
    references: [baniText(5), {
      label: 'Sikh Research Institute: Sabad Hajare Patisahi 10',
      url: 'https://sikhri.org/tags/sabad-hajare',
    }],
  },
  6: {
    name: 'Tav Prasad Savaiye (Sraavag Suddh)',
    summary: 'These ten savaiye from Akal Ustat question reliance on ritual, wealth and worldly power, and affirm loving devotion to the Divine.',
    detail: 'Beginning Sraavag Suddh, this is the morning Nitnem selection, numbered 21–30 within Akal Ustat; the Dheenan Ki selection contains different verses.',
    references: [baniText(6), rehatMaryada],
  },
  7: {
    name: 'Tav Prasad Savaiye (Dheenan Ki)',
    summary: 'A separate sequence of ten savaiye from Akal Ustat begins by praising the One who sustains the humble and all living beings.',
    detail: 'These are stanzas 243–252 of Akal Ustat, distinct from the Sraavag Suddh sequence; they turn attention from outward observances toward remembrance of the Timeless One.',
    references: [baniText(7), {
      label: 'iGurbani: Savaiye Deenan',
      url: 'https://www.igurbani.com/read/3-svaiye-deenan',
    }],
  },
  8: {
    name: 'Akal Ustat Chaupai',
    summary: 'The opening chaupai section of Akal Ustat praises the One Creator present throughout creation and beyond distinctions of form and caste.',
    detail: 'This selection contains the opening invocations and ten chaupai stanzas of the longer Akal Ustat composition.',
    references: [baniText(8), {
      label: 'iGurbani: Akal Ustat Chaupai',
      url: 'https://www.igurbani.com/read/9-akal-ustat-chaupai',
    }],
  },
  9: {
    name: 'Benti Chaupai Sahib',
    summary: 'Guru Gobind Singh Ji’s prayer of supplication asks for protection, guidance and steadfast devotion to the One.',
    detail: 'It is recited within Rehras Sahib and during Amrit Sanchar; different recitation traditions include different opening and closing passages.',
    references: [baniText(9), rehatMaryada],
  },
  12: {
    name: 'Chandi Charitar Ustat',
    summary: 'The six-stanza closing section of the second Chandi Charitar moves from the aftermath of battle to verses of praise.',
    detail: 'Also headed Ath Chandi Charitar Ustat, this is the eighth chapter, numbered 257–262, rather than the entire Chandi Charitar narrative.',
    references: [baniText(12), {
      label: 'iGurbani: Chandi Charitar Ustat',
      url: 'https://www.igurbani.com/read/9-chandi-charitar-ustat',
    }, {
      label: 'Punjabi University, Encyclopaedia of Sikhism: Chandi Charitra',
      url: 'https://eos.learnpunjabi.org/CHANDI%20CHARITRA.html',
    }],
  },
  13: {
    name: 'Chandi Di Vaar (Vaar Sri Bhagauti Ji Ki)',
    summary: 'This Punjabi martial ballad recounts Chandi’s battles against demonic forces through vivid scenes of conflict and courage.',
    detail: 'Its opening pauri, beginning Pritham Bhagauti Simar Kai, forms the opening of Ardaas; the full Vaar continues through 55 pauris.',
    references: [baniText(13), guruBiography, {
      label: 'SGPC: Ardaas',
      url: 'https://sgpc.net/ardas/',
    }],
  },
  19: {
    name: 'Shastar Naam Mala (Opening Chapter)',
    summary: 'The opening chapter of Shastar Naam Mala invokes protection through the names and imagery of swords, arrows and other weapons.',
    detail: 'This selection is the 27-couplet Bhagauti Ustat chapter; the much longer Shastar Naam Mala continues beyond it.',
    references: [baniText(19), {
      label: 'iGurbani: Shastar Naam Mala Bhagauti Ustat',
      url: 'https://www.igurbani.com/read/9-shastar-naam-mala-bhaugati-ustat',
    }, {
      label: 'SGPC Gurdwara Gazette: Shastar Nam Mala, page 196',
      url: 'https://sgpc.net/gazette/2020/November/Nov-English.pdf',
    }],
  },
  24: {
    name: 'Ardaas (Prayer of Supplication)',
    summary: 'The Sikh communal prayer remembers the Gurus, the Panth’s sacrifices and shared commitments, and asks for guidance and the welfare of all.',
    detail: 'Its opening comes from Vaar Sri Bhagauti Ji Ki; the prayer continues with remembrance of Sikh history and supplications for the community.',
    references: [{ label: 'SGPC: Ardaas', url: 'https://sgpc.net/ardas/' }, baniText(24)],
  },
  25: {
    name: 'Sri Bhagauti Astotr (Panth Prakash)',
    summary: 'The Panth Prakash version of this praise of Bhagauti centres on the sword, martial courage and protection.',
    detail: 'Its wording and additional closing chaupai distinguish it from the Hazur Sahib version.',
    references: [baniText(25), baniText(26)],
  },
  26: {
    name: 'Sri Bhagauti Astotr (Hazur Sahib)',
    summary: 'The Hazur Sahib version of this praise of Bhagauti invokes the sword through images of strength, courage and protection.',
    detail: 'This version has its own wording and closes with an appeal to protect Guru Gobind Singh, without the additional chaupai in the Panth Prakash version.',
    references: [baniText(26), baniText(25)],
  },
  28: {
    name: 'Barah Maha Savaiye (Krishna Avtar)',
    summary: 'This twelve-month sequence from Krishna Avtar follows the gopis’ memories of Krishna and their longing as the seasons change.',
    detail: 'Beginning with Phagan, it comprises stanzas 867–879 and is distinct from the Barah Maha compositions in Guru Granth Sahib.',
    references: [baniText(28), {
      label: 'The Guru Granth Sahib Project: Barah Maha as a poetic form',
      url: 'https://gurugranthsahib.io/bani/introduction/22/Introduction',
    }],
  },
  29: {
    name: 'Akal Ustat (Praise of the Timeless One)',
    summary: 'Guru Gobind Singh Ji’s extended praise of the Timeless One affirms the Divine beyond religious and social divisions.',
    detail: 'The opening chaupai and both Tav Prasad Savaiye selections are passages within this longer composition.',
    references: [baniText(29), guruBiography, {
      label: 'SGPC Gurdwara Gazette: Akal Ustat, page 194',
      url: 'https://sgpc.net/gazette/2020/November/Nov-English.pdf',
    }],
  },
  53: {
    name: 'Ugardanti',
    summary: 'A six-part composition invokes Bhagauti through images of divine power, battle and protection, with supplications for the Khalsa Panth.',
    detail: 'Also called Bhagauti Chhand Chhakka, its language draws on the imagery of Durga and includes appeals for compassion and devotion.',
    references: [baniText(53), {
      label: 'NaamSimran: Ugardanti text and translation',
      url: 'https://www.namsimran.com/banis/53',
    }],
  },
} satisfies BaniDiscoveryEntries

// Zafarnama is a browse entry without a BaniDB selection ID.
export const ZAFARNAMA_DISCOVERY = {
  name: 'Zafarnama (Letter of Victory)',
  summary: 'Guru Gobind Singh Ji’s Persian verse letter to Emperor Aurangzeb challenges broken promises and asserts moral responsibility in the exercise of power.',
  detail: 'Written at Dina after the evacuation of Anandpur, it condemns the breach of sworn assurances of safe passage.',
  references: [guruBiography],
} satisfies BaniDiscoveryEntry
