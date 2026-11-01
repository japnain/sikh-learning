# Read follow-up review — 1 November 2026

Three separate AI reviewers checked all **104 bani entries plus Zafarnama** against captured real BaniDB selections, primary scripture pages and specialist sources. The reviewers did not author the entries assigned to them. Six entries received corrections or clearer explanations of their selection boundaries. The implementation owner independently checked the correction sources and applied the changes.

## Corrections applied

| Entries | Change | Supporting evidence |
|---|---|---|
| 11 · Laavan | The English title now reads “Laavan (The Four Wedding Verses)”; the summary identifies four stanzas rather than four separate hymns. | [Guru Granth Sahib Project: Lavan](https://gurugranthsahib.io/bani/introduction/41/Introduction). |
| 40 · Ghorian | About explains that this reading contains the first of Guru Ram Das Ji’s two Ghorian compositions. | Selected provider ending; [Ghorian introduction](https://gurugranthsahib.io/bani/Ghoria). |
| 41 · Karhale | About identifies the first of the two compositions, with ten selected stanzas on Ang 234. | Selected provider ending; [the second Karhala](https://gurugranthsahib.io/bani/details/Karhale/2/2). |
| 81, 82 · Bhatt Savaiye | The Guru Nanak and Guru Angad selections now name Bhatt Kalya Ji as their poet. The wider Bhatt corpus has several authors, but these two groups do not. | [Savaiye attribution table and individual sections](https://gurugranthsahib.io/bani/introduction/89/Introduction). |
| 87 · Majh Vaar | About explains that the actual reading also includes Guru Nanak Dev Ji’s following Gauri Guareri hymn on Ang 151, after the Vaar. Added direct references. | Captured [BaniDB 87](https://api.banidb.com/v2/banis/87) tail and [Ang 151](https://www.srigranth.org/servlet/gurbani.gurbani?Action=Page&Param=151). |

Only discovery copy, its references and the existing Laavan display-name test expectation changed. Scripture text, exact reading identities, navigation and scroll handling were not edited.

## Complete review coverage

| Independent assignment | Coverage | Result |
|---|---:|---|
| [SGGS and collected readings](2026-11-01-sggs-independent-review.md) | 43 entries | Five entries corrected or clarified; final copy reviewed. |
| [Bhagat selections and Vaars](2026-11-01-selections-independent-review.md) | 46 entries | Majh Vaar selection clarified; remaining entries supported by inspected evidence. |
| [Dasam, Ardaas and Zafarnama](2026-11-01-dasam-independent-review.md) | 15 entries + Zafarnama | No source-established correction required. |

These reports contain per-entry dispositions, source links and evidence boundaries. The provider snapshots are the real 31 October captures, with all captured headings, opening/closing passages and Ang lists. Fresh scripture and research-project retrievals resolve the identified questions. This is a contextual review, not an independent translation of every line or a critical edition.

## Verification

- **131 tests across six files passed**, covering catalogue completeness, shared rows, search and Read page behavior. [Final test log](read-review-2026-11-01/tests.log). The initial run had one outdated Laavan title expectation; it was updated to the reviewed title and the complete targeted suite then passed.
- Application TypeScript and scoped ESLint passed.
- Production build, startup bundle budget, public-data copying and story-build verification passed. Startup JavaScript remains 151.4 KiB gzip and CSS 12.8 KiB gzip. [Build log](read-review-2026-11-01/build.log).
- The rebuilt local review app visibly shows the corrected Laavan name and summary in search. Desktop screenshot inspection found the name and complete summary readable within the result card. Clicking it opened the exact `baniDbId=11` / `baniId=laavan` reading. Reader Back restored `query=Laavan&scope=gurbani` and focus to the matching result. The harness uses fixture-backed scripture searches; this does not certify live search quality.
- Previous catalogue-wide mobile and 200% text measurements remain documented in the [31 October remediation report](2026-10-31-read-remediation.md). They are previous-run evidence, not newly repeated physical-device tests.

## iPhone testing limitation

Both available device inventories failed before returning a usable device list:

| Attempt | Result |
|---|---|
| `xcrun devicectl list devices` | CoreDeviceService failed to initialize and timed out after an invalid XPC connection. |
| `xcrun simctl list devices available` | CoreSimulatorService connection became invalid/refused; its log file also reported an operation-not-permitted error. |

The Chrome DevTools connector also reported its browser profile was already in use. Native Chrome UI remained usable for the bounded desktop check above. The service failures do not establish whether an iPhone is physically connected. No physical iPhone momentum scrolling, Safari Home Screen behavior, OS keyboard or VoiceOver test was completed or signed off.

Independent AI source review is complete for this catalogue. A named human subject-matter/English review has not occurred. No external reviewer was contacted, and no human approval status was changed. The separate story-review and Panth Prakash proofreading limitations in the original report remain open.
