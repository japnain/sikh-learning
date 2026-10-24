# Stories: Matter reference and Naamras adaptation

Reference reviewed 21 October 2026. Scope: English, reading-only Sikh stories inside the existing Naamras app.

## Evidence and limits

- Official product page: https://www.getmatter.com/
- Official published light library asset: https://www.getmatter.com/_next/image?q=75&url=%2Fimages%2Fhero-home.png&w=3840
- Official published dark article asset: https://www.getmatter.com/_next/image?q=75&url=%2Fimages%2Fhero-article.png&w=3840
- Official App Store description: https://apps.apple.com/ca/app/matter-reading-app/id1501592184

Both promotional images were opened and visually inspected during research. These establish the pictured states only; they are not captures from a running app. Public page text verifies customizable themes/fonts, offline reading, tagging, search, and friction-light highlighting. It does not establish the precise CSS, gestures, transitions, or responsive breakpoints. An additional HTML/stylesheet retrieval did not complete. No exact Matter font, hex color, spacing measurement, asset download, or pixel-perfect reconstruction is claimed. No Matter branding, artwork, or code has been copied.

## Observed design principles

| Observed in published assets | Transferable principle |
| --- | --- |
| Library entries prioritize title and secondary reading metadata within a restrained list | Make story titles easy to scan; keep duration, topic, and collection context secondary |
| Article presentation gives substantial space to serif body text | Treat reading typography as the primary component, with a comfortable single column |
| Light library and dark article surfaces have coherent hierarchy | Preserve the same title/body/metadata relationships across Naamras themes |
| Controls and decoration occupy less visual weight than the reading content | Keep actions compact and place secondary source information behind a clearly labeled control |
| Published product text describes customizable fonts/themes | Offer a small appearance surface with useful controls rather than many competing visual treatments |

Observed spacing is qualitative. The images do not justify numeric padding, line-height, or font-size claims.

## Proposed Naamras design decisions

These are original implementation choices, not extracted Matter specifications:

- Retain Naamras's existing parchment, navy, brass, navigation, shared settings, and Saved system. Stories should feel like another room in the app.
- Use a continuous, readable serif story column with generous line spacing and an adjustable text size; constrain desktop width to a comfortable reading measure.
- Lead the library with curated thematic collections, followed by clean story rows. A small selection with clear editorial intent is more useful than a decorative grid of interchangeable covers.
- Keep the reading toolbar quiet: Back, title/context, appearance, and Save. Use the existing app interaction vocabulary and touch-target rules.
- Separate the narrative from a source sheet with specific edition/passage references and explicit account/retelling labels. This is Naamras's editorial distinction, not an established Matter feature.
- Show sources as reading context rather than repeated warning cards between paragraphs. Keep references available without interrupting the narrative.
- Resume where the user left off. Save/bookmark state should use the same mental model as the rest of Naamras.
- End with a considered next story or return to collection; avoid an infinite feed, progress pressure, or unrelated dashboard furniture.

## Final comparison checklist

1. Does a story read as a calm article, with the title and prose carrying the visual hierarchy?
2. Are duration and collection metadata visibly quieter than the title?
3. Does the story screen retain Naamras's actual shell, shared settings, and Saved behavior?
4. Is the toolbar usable but less prominent than the text?
5. Does the source sheet contain the actual references without crowding the prose?
6. Do parchment and dark themes preserve contrast, spacing, and the same information order?
7. At large text size and narrow mobile width, can the reader continue without horizontal scrolling or clipped controls?

This is an evidence-based adaptation of Matter's reading restraint, not a clone or a standalone replacement for the app.
