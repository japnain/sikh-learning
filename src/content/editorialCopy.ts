import type { UiLocale } from "../types"

export type EditorialCopy = {
  brand: {
    name: string
    domain: string
    promise: string
    metaTitle: string
    metaDescription: string
    splashTagline: string
    attribution: string
  }
  home: {
    heroEyebrow: string
    heroTitle: string
    heroBody: string
    learnSearchEyebrow: string
    learnSearchTitle: string
    learnSearchBody: string
    learnSearchPlaceholder: string
    readGatewayEyebrow: string
    readGatewayTitle: string
    readGatewayBody: string
    lessonEyebrow: string
    lessonFallback: string
    pathBodyPrefix: string
    savedTitle: string
    discoveryEyebrow: string
    shareProgress: string
  }
  learn: {
    eyebrow: string
    tabCopy: Record<"today" | "topics" | "shabads" | "saved", { title: string; body: string }>
    heroEyebrow: string
    heroTitle: string
    heroBody: string
    heroSearchPlaceholder: string
    heroSearchHint: string
    proofEyebrow: string
    proofTitle: string
    proofBody: string
    proofFooter: string
    inventoryLabels: Record<"dailyGuidance" | "shabadDeepDives" | "topicGuides" | "collections" | "crossLinks", string>
    compactGuidanceBody: string
    compactShabadBody: string
    compactTopicBody: string
    compactContinueBody: string
    compactCollectionsBody: string
    detailHeading: string
    detailBody: string
    topicsIntroTitle: string
    topicsIntroBody: string
    topicsSearchPlaceholder: string
    shabadsIntroTitle: string
    shabadsIntroBody: string
    savedIntroTitle: string
    savedIntroBody: string
  }
  read: {
    eyebrow: string
    title: string
    body: string
    quickFindEyebrow: string
    quickFindTitle: string
    quickFindBody: string
    featuredFlowEyebrow: string
    featuredFlowBody: string
  }
  library: {
    body: string
    snapshotTitle: string
    reviewBody: string
  }
  more: {
    title: string
    body: string
    promiseBody: string
    growDescription: string
    aboutBody: string
  }
  onboarding: {
    brandBody: string
  }
}

const ENGLISH_EDITORIAL_COPY: EditorialCopy = {
  brand: {
    name: "NaamRas",
    domain: "Naamras.xyz",
    promise: "A deliberate daily space for Gurbani, meaning, and return.",
    metaTitle: "NaamRas",
    metaDescription: "NaamRas is a premium Gurbani reading and learning app for daily Nitnem, canonical study, and a steadier return to scripture.",
    splashTagline: "Read. Reflect. Return.",
    attribution: "via NaamRas",
  },
  home: {
    heroEyebrow: "Naamras.xyz",
    heroTitle: "Keep Gurbani close enough to return to every day.",
    heroBody: "NaamRas brings daily reading, honest study, and disciplined return into one composed ritual.",
    learnSearchEyebrow: "Learn",
    learnSearchTitle: "Search the living archive.",
    learnSearchBody: "Enter through a question and let the archive guide you into topic pages, shabad study, and connected collections.",
    learnSearchPlaceholder: "Search anxiety, doubt, speech, patience, mercy, seva, hukam…",
    readGatewayEyebrow: "Read",
    readGatewayTitle: "Go straight to the text.",
    readGatewayBody: "Open ang, first letters, transliteration, or a specific bani when you already know where you need to go.",
    lessonEyebrow: "Today in NaamRas",
    lessonFallback: "Open Learn to begin today’s measured lesson.",
    pathBodyPrefix: "Keep the daily rhythm intact:",
    savedTitle: "Keep what should remain close.",
    discoveryEyebrow: "Return Paths",
    shareProgress: "Share NaamRas progress",
  },
  learn: {
    eyebrow: "NaamRas Learn",
    tabCopy: {
      today: {
        title: "Today",
        body: "A short first surface for the day: one question, one shabad, one next step, and an archive that tells the truth about its own depth.",
      },
      topics: {
        title: "Topics",
        body: "Search the ache directly and land on canonical guidance instead of improvised interpretation.",
      },
      shabads: {
        title: "Shabads",
        body: "Study whole shabads with structure, emotional context, and cross-links that keep each passage in conversation with the rest of the archive.",
      },
      saved: {
        title: "Saved",
        body: "Keep verses, topic guides, and deep dives together without losing what kind of doorway each one opened.",
      },
    },
    heroEyebrow: "Naamras.xyz",
    heroTitle: "Find the guide that meets the question.",
    heroBody: "Search fear, anger, ego, loneliness, doubt, speech, patience, greed, purpose, mercy, seva, or hukam. NaamRas routes you into approved guidance, full-shabad study, and connected journeys.",
    heroSearchPlaceholder: "Search anxiety, doubt, seva, hukam…",
    heroSearchHint: "Search stays canonical: it brings you to an approved guide first, then keeps the wider shabad close.",
    proofEyebrow: "Archive in public",
    proofTitle: "The library is growing in public.",
    proofBody: "These counts are live. NaamRas shows the actual depth of the archive instead of pretending the work is already complete.",
    proofFooter: "Depth is more than volume. Cross-links keep guidance, topic work, and full shabad study answering each other.",
    inventoryLabels: {
      dailyGuidance: "Daily guidance entries",
      shabadDeepDives: "Full shabad deep dives",
      topicGuides: "Topical answer pages",
      collections: "Curated collections",
      crossLinks: "Cross-links",
    },
    compactGuidanceBody: "A short doorway into the day, anchored in a real line and written for return rather than skimming.",
    compactShabadBody: "A featured shabad chosen for full context, not just a single quotable line.",
    compactTopicBody: "The question most worth opening today, drawn into a real canonical guide.",
    compactContinueBody: "Keep one thread active so the archive remembers where your deeper work was already moving.",
    compactCollectionsBody: "Collections hold longer arcs together when one day’s guidance is not enough.",
    detailHeading: "Open Detail",
    detailBody: "Only one full detail surface stays open at a time so the archive feels deliberate instead of endless.",
    topicsIntroTitle: "Search the approved guide.",
    topicsIntroBody: "Bring the question plainly. NaamRas answers with the approved guide first and keeps the full shabad within reach.",
    topicsSearchPlaceholder: "Search stress, doubt, speech, purpose…",
    shabadsIntroTitle: "Study the full context.",
    shabadsIntroBody: "Filter by theme, Guru, raag, depth, and what you have already kept close so the next long reading is chosen, not stumbled into.",
    savedIntroTitle: "Keep what is still working on you.",
    savedIntroBody: "Saved pieces keep their shape, so a line, a guide, and a full shabad stay distinct when you return.",
  },
  read: {
    eyebrow: "Read",
    title: "Move directly into Gurbani.",
    body: "Search first letters, transliteration, meaning, or exact ang and reach the text without decorative friction.",
    quickFindEyebrow: "Quick Find",
    quickFindTitle: "Search by the shape you remember first.",
    quickFindBody: "Use first letters, English meaning, transliteration, or direct ang lookup according to what is already present in your mind.",
    featuredFlowEyebrow: "Featured Flow",
    featuredFlowBody: "Move from Ardaas into a random Hukamnama when you want the reading session to arrive as a received answer rather than a planned one.",
  },
  library: {
    body: "Return to what you marked, kept, or left mid-reading without breaking the thread of the practice.",
    snapshotTitle: "What you keep here should stay within reach.",
    reviewBody: "Saved words and phrases remain ready for short, steady review instead of falling out of the daily rhythm.",
  },
  more: {
    title: "Shape the reading environment.",
    body: "Reader choices inside NaamRas should feel deliberate, composed, and close to the text rather than busy for their own sake.",
    promiseBody: "The aim is a premium daily reading room: calm surfaces, trustworthy controls, and a steady relationship to Gurbani each time you return.",
    growDescription: "Open the editorial archive, topic guides, deep dives, and collections that deepen over time.",
    aboutBody: "NaamRas is a premium Gurbani reading and learning app shaped for daily return, honest study, and real continuity between line, shabad, and lived reflection.",
  },
  onboarding: {
    brandBody: "NaamRas should open like a composed reading room: calm, guided, and already pointed toward the kind of return you want to build.",
  },
}

export function getEditorialCopy(locale: UiLocale): EditorialCopy | null {
  return locale === "en" ? ENGLISH_EDITORIAL_COPY : null
}
