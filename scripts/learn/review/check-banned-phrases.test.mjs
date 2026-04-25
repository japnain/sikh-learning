import { describe, expect, test } from "vitest"
import { collectBannedPhraseMatchesForFileContent } from "./check-banned-phrases.mjs"

describe("check-banned-phrases", () => {
  test("ignores preserved scripture fields while scanning learn editorial JSON", () => {
    const content = JSON.stringify({
      id: "shabad-search-ends-in-saint-company",
      title: "Search ends in saint company",
      summary: "The seeker stops roaming when holy company shows where union is received.",
      lines: [
        {
          gurmukhi: "...",
          transliteration: "...",
          translation: "My Lord is both unmanifest and manifest; unite me with Him.",
        },
      ],
    })

    expect(
      collectBannedPhraseMatchesForFileContent(
        "public/data/learn/details/shabad-deep-dive/shabad-search-ends-in-saint-company.json",
        content,
      ),
    ).toEqual([])
  })

  test("still catches banned phrases in app-authored learn JSON", () => {
    const content = JSON.stringify({
      id: "shabad-buy-what-goes-with-you",
      whyItMatters: "This is for anyone who feels safe through buying status.",
    })

    expect(
      collectBannedPhraseMatchesForFileContent(
        "public/data/learn/details/shabad-deep-dive/shabad-buy-what-goes-with-you.json",
        content,
      ),
    ).toContain("/\\bthis is for anyone who feels\\b/i")
  })

  test("ignores test fixtures that document banned phrase expectations", () => {
    expect(
      collectBannedPhraseMatchesForFileContent(
        "src/data/learnRepository.test.ts",
        "const scaffold = 'keep this close and do not let the day outrun this'",
      ),
    ).toEqual([])
  })
})
