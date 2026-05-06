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
    inventoryLabels: Record<"dailyGuidance" | "shabadDeepDives" | "topicGuides" | "topicScenarios" | "collections" | "crossLinks", string>
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
    learnSearchTitle: "Search the archive.",
    learnSearchBody: "Preview the strongest doorway here, then continue the same query in Learn or Read.",
    learnSearchPlaceholder: "Search anxiety, Japji Sahib, hukam, or Ang 12…",
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
        body: "Start with one real need, one substantial passage, and one next act of return. No filler, no fake depth.",
      },
      topics: {
        title: "Topics",
        body: "Bring the pressure plainly. Open a guide that can actually carry the question, then stay with the verses long enough for the teaching to argue back.",
      },
      shabads: {
        title: "Shabads",
        body: "Study whole shabads and meaningful verse spans, not isolated lines pretending to be enough on their own.",
      },
      saved: {
        title: "Saved",
        body: "Keep what is still working on you, with enough context that the return still has weight.",
      },
    },
    heroEyebrow: "Naamras.xyz",
    heroTitle: "Find the guide that can actually bear the question.",
    heroBody: "Search the need plainly. NaamRas should open one trustworthy guide, keep real verse depth in front of you, and hold the next faithful return close without flattening everything into one mood.",
    heroSearchPlaceholder: "Search anxiety, shame, speech, hukam…",
    heroSearchHint: "Start with the clearest guide. Then open the matching scenario and the deeper verses that give the teaching its full force.",
    proofEyebrow: "Reviewed archive",
    proofTitle: "This archive is here to carry real return, not to perform volume.",
    proofBody: "Counts stay visible, but the standard is substance: stronger guidance, deeper excerpts, truer scenario differences, and links that still make sense when you come back later.",
    proofFooter: "The archive grows by editorial discipline. Distinct guidance, real scenario movement, and trustworthy cross-links matter more than sounding spiritual at scale.",
    inventoryLabels: {
      dailyGuidance: "Daily guidance entries",
      shabadDeepDives: "Full shabad deep dives",
      topicGuides: "Canonical topic guides",
      topicScenarios: "Scenario views",
      collections: "Curated collections",
      crossLinks: "Cross-links",
    },
    compactGuidanceBody: "Open a guidance doorway that is actually tied to more than one line, then carry the turn back into the day.",
    compactShabadBody: "A featured shabad with enough verse depth to show the movement, not just the slogan.",
    compactTopicBody: "Read the guide first. Then open the scenario and the deeper verses that make the teaching specific, demanding, and usable.",
    compactContinueBody: "Keep one serious thread active so the archive remembers where your deeper work was already moving.",
    compactCollectionsBody: "Collections should hold a real arc together when one day’s guidance is not enough.",
    detailHeading: "Open one doorway, then stay with it.",
    detailBody: "Open one full detail surface at a time so the verses, the guide, and the next faithful return stay in one continuous thread.",
    topicsIntroTitle: "Search the guide that can answer the pressure.",
    topicsIntroBody: "Bring the question plainly. Start with the strongest guide, open the scenario closest to the pressure you are in, and let the deeper verses force a truer reading than mood alone would give you.",
    topicsSearchPlaceholder: "Search stress, shame, speech, purpose…",
    shabadsIntroTitle: "Stay with the whole movement.",
    shabadsIntroBody: "Filter by theme, Guru, raag, depth, and what you have already kept close. Then stay with enough of the shabad that context can correct the line that first arrested you.",
    savedIntroTitle: "Keep what still has work left to do on you.",
    savedIntroBody: "Saved pieces keep their shape and their depth. A guide stays a guide, a verse stays tied to its shabad, and a return still has context when you come back.",
  },
  read: {
    eyebrow: "Read",
    title: "Move directly into Gurbani.",
    body: "Search first letters, transliteration, meaning, or exact ang and reach the text without decorative friction.",
    quickFindEyebrow: "Quick Find",
    quickFindTitle: "Search by the shape you remember first.",
    quickFindBody: "Use first letters, meaning, transliteration, or direct ang lookup.",
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
