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
    metaDescription: "NaamRas is a premium Gurbani reading app for daily Nitnem, canonical study, and a steadier return to scripture.",
    splashTagline: "Read. Reflect. Return.",
    attribution: "via NaamRas",
  },
  home: {
    heroEyebrow: "Naamras.xyz",
    heroTitle: "Keep Gurbani close enough to return to every day.",
    heroBody: "NaamRas brings daily reading, honest study, and disciplined return into one composed ritual.",
    readGatewayEyebrow: "Read",
    readGatewayTitle: "Go straight to the text.",
    readGatewayBody: "Open ang, first letters, transliteration, or a specific bani when you already know where you need to go.",
    lessonEyebrow: "Today in NaamRas",
    lessonFallback: "Open Read to begin today’s measured reading.",
    pathBodyPrefix: "Keep the daily rhythm intact:",
    savedTitle: "Keep what should remain close.",
    discoveryEyebrow: "Return Paths",
    shareProgress: "Share NaamRas progress",
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
    aboutBody: "NaamRas is a premium Gurbani reading app shaped for daily return, honest study, and real continuity between line, shabad, and lived reflection.",
  },
  onboarding: {
    brandBody: "NaamRas should open like a composed reading room: calm, guided, and already pointed toward the kind of return you want to build.",
  },
}

export function getEditorialCopy(locale: UiLocale): EditorialCopy | null {
  return locale === "en" ? ENGLISH_EDITORIAL_COPY : null
}
