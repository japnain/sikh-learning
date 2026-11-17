# NaamRas UI / UX implementation — 15 November 2026

Status: release candidate verified on `codex/offline-banis`, including the current master integration. This follows `naamras-ui-ux-brand-audit-20261115.md`. The acceptance results below distinguish tested behavior from the remaining device and editorial work.

## Direction retained

A calm Sikh reading app centred on daily practice and a useful reading library. Golden Court remains the home direction. Artwork frames discovery; the reader keeps a quiet, flat surface. Cormorant is the shared display face, with script fallbacks and legible interface text. One primary action per section, short overview lists, and deeper controls on request.

The existing scripture text, headings, endings, source versions, length defaults and reading positions are preserved. No new equivalence between Shabad OS editions and Short / Medium / Long is introduced.

## Implemented

| Audit items | Change |
|---|---|
| R1 | Book sheet backgrounds now take precedence over the global dark utility. Paper, Sepia and Night selectors retain matching precedence for their own palette variables. Contents, Appearance and Notes use the same surface. All four palettes were rendered under light and dark app themes; sheet text and surfaces were checked. |
| R2 | New prose preferences default to Follow app. Books, stories and Rehat resolve this to Paper or Night. Existing explicit version-one Paper/Sepia/Night preferences are preserved, including backup restoration. |
| R3, R7, B1 | Larger book navigation/settings labels; global display and sans roles; 44px recovery actions; localized application skip link. |
| R4, R5 | Localized Gurbani loading, failed and empty states; one loading announcement outside the busy region; decorative skeletons hidden from assistive technology; pulse disabled for reduced motion. |
| R6 | One verse-action tab stop per passage. Arrow keys and Home/End reach other lines; Enter opens actions. A focus-only skip link reaches the end of reading. Contents jumps update the active action without changing text order. |
| U1–U3, U8 | Read has a compact title, collection artwork, search options shown when engaged, an independent Recent disclosure, and one global continuation section above collections. Ardaas remains available as a compact link. Back/clear controls have quieter emphasis. |
| U4, U5 | Saved has one continuation area, no duplicated Resume card or metric row, no empty Review Bank shortcut, and six-item category previews with View all. Search and category filters retain the full collection. |
| U7 | More distinguishes Gurbani reading from Books, stories and Rehat; the latter exposes shared size, spacing, width and page-color preferences. |
| U9, partial | Help copy no longer implies a report will be sent when no inbox is configured. A public project-owned contact destination remains outstanding. |
| O1 | More and Read link to Downloads, bringing explicit bani, story and book downloads together. This is not a complete inventory of every opportunistically cached reading. |
| O2–O5 | Downloaded banis have search and a bounded overview. The bani queue survives route unmount, retries unfinished work, and supports cancellation. Failed storage reads do not show an empty state. Removal returns focus to the panel summary and announces preservation of bookmarks/progress. |
| O6 | Before download, metadata estimates include each named length once and omit its duplicate default alias. Estimates describe text bytes, not exact transfer or browser storage usage; app files/overhead are extra. Availability remains usable if estimates fail. |
| O7 | Collapsed bani downloads retain progress and outcome announcements outside the closed disclosure; failures remain visible in the summary. |
| O8 | Story download controls move near the collection heading and include cancellation; completed stories remain available. Book controls explicitly explain that leaving the screen cancels an active book download. |
| L1, L2 | Welcome offers English / ਪੰਜਾਬੀ / हिन्दी. Begin reading completes onboarding directly and preserves a shared destination; Personalize reading retains the two optional preference steps. |
| L3, partial; L4 | About descriptions now cover Gurbani, Nitnem, stories and historical books in all three locales. New controls and reader states are localized. Selected internal-sounding discovery phrases are replaced with direct reading actions. Fluent language review remains outstanding. |
| B3, partial; B4, partial | Welcome uses the display wordmark face; navigation artwork no longer requests pixelated rendering. App-icon and full navigation-asset redesign are not part of this checkpoint. |
| B5, partial | Artwork settings provide About this artwork. Verified source links are retained; missing artist/date/collection metadata is clearly identified rather than invented. Golden Court attribution is still unverified. |
| B6, B7, partial; B8 | Reduced repeated framing/introductions, larger useful reader labels, removal of obsolete hero/featured-card/metric CSS, and plain product metadata without “premium” or “canonical study.” Book edition details contain the long source-quality note. |

## Open work and acceptance gates

- **Rendered acceptance passed:** 320/390/1440px, light/dark main screens, all prose palettes, settings Escape/focus return, and the Daily Bani/More journey at 200% text. These checks are Chromium-based; a complete assistive-technology or device certification is not claimed.
- **Offline acceptance passed:** real HTTP downloads, a closed/restarted browser profile with networking disabled, all named lengths, provider-specific bookmarks, Contents/Find, Continue here and Saved reopening. Safari/iPhone and installed-app behavior remain unverified on a physical device.
- **O9:** the four Shabad OS readings remain available in Read and Downloads. They are not yet provider-aware Daily Bani choices. This requires routing, completion, practice and backup acceptance; it must not alias six-pauri Anand to an existing length.
- **U6:** Favorite, passage bookmarks and Review Bank remain distinct concepts. A consistent Save interaction across all readers is still open; existing saves have not been migrated or merged.
- **B2, B3, B4, B7:** full colour/radius consolidation, app-icon family and navigation artwork need the side-by-side visual pass. Broad palette changes are not signed off solely from CSS inspection.
- **B5 / L3 / U9:** verify missing artwork attribution, review translations with fluent readers, and configure a project-owned help destination without exposing personal contact details.

## Verification

- Full regression suite: **2,968 tests passed across 195 files**, including all exact-length/offline data, source identity, saved defaults/places, practice completion, backup, privacy and navigation checks.
- Production build and TypeScript: passed. Startup JavaScript **188.9 KiB gzip / 190 KiB budget**; startup CSS **13.4 KiB / 36 KiB**.
- ESLint, custom CSS selector audit (34 files), browser-acceptance script syntax and whitespace checks: passed.
- Public artifact privacy: passed for **294 text artifacts**; no matching private files, credentials, developer paths or personal contact addresses. Story build: 8 published readings, 3 editorial drafts excluded.
- Added behavioural coverage for navigation during bani downloads, cancellation/retry, pre-download estimates, bounded download lists, failed storage without false emptiness, removal focus, explicit-palette hydration, theme-following defaults, all 108 manager routes, current default-length routing, keyboard verse navigation, direct onboarding/shared destinations, app-language independence and shared prose preferences.
- Offline browser suite passed: 108 readings, 118 distinct stored versions, 14 named length switches, four Shabad OS readings, 19 offline assertions and 13 responsive reader/sheet layouts; no page errors or backend writes. Existing preferences and ordered rows matched exactly.
- Design browser matrix passed 44 screen/palette checks; Daily Bani/More passed all four configurations, including 320px at 200% text.
- Final reader regression: 118 tests passed, including sticky-header focus shifting scroll before Continue here and keyboard activation. Merge integration regression: 118 tests passed across More, Daily Bani, backup and app routing.
- Browser findings fixed: the selected line is retained through header scroll anchoring; narrow More summaries stay compact; enlarged-text volume and picker controls remain reachable. The QA initializer skips documents outside the app origin.

## Release boundary

Current master’s privacy, Daily Bani, More and soundscape improvements were merged and rechecked. Only reviewed public application source and public browser configuration were used in the temporary QA environment; private environment files and Git metadata were excluded. Publication and production verification are recorded separately from local checks.
