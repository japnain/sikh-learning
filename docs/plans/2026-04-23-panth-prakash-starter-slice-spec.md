# Panth Prakash starter-slice spec

Goal
- Ship one reviewed Panth Prakash path that feels premium, trustworthy, and historically legible before broadening the whole corpus.
- Keep page coverage intact; improve the opening reading path with better framing, summaries, and trust markers.

Grounded source state
- Work id: `panth-prakash-english`
- Route front door: `/library/panth-prakash-english`
- Source manifest: `scripts/library/sources/panth-prakash-english.sources.json`
- Work metadata: `public/data/library/works/panth-prakash-english/work.json`
- Episode index: `public/data/library/works/panth-prakash-english/episodes.json`
- Provenance: `public/data/library/works/panth-prakash-english/provenance.json`

Why this arc first
- It is the strongest high-interest contiguous run already visible in the episode index.
- It covers a coherent movement users will immediately recognize: Khalsa formation -> expansion -> Anandpur -> battle pressure -> direct handoff toward Chamkaur.
- It already contains anchor pages with usable text and two manual rescue pages (`133`, `163`) that show the editorial direction we want.
- It is tight enough to review deeply without pretending the whole 1,417-page corpus is equally ready.

Chosen starter slice
- Slice id: `khalsa-anandpur-arc-v1`
- Work: `panth-prakash-english`
- Volume: 1
- Primary page range: `128-163`
- Handoff page: `163` opens directly toward Episode 19 / Chamkaur

Included sections
1. Episode 15 — Creation of the Khalsa Panth
   - Pages: `128-133`
   - Current title in index: `Episode About the Creation the Khalsa Panth`
   - Editorial short label: `Creation of the Khalsa`
   - Why included:
     - distinct beginning
     - strong reader interest
     - contains initiation, Panj Piare, and distributed authority themes
   - Notable page anchors:
     - `128`: episode opening, Panj Piare selection and khande-di-pahul setup
     - `133`: manual editorial bridge into Episode 16 and delegated Khalsa authority

2. Episode 16 — Expansion of the Khalsa Panth
   - Pages: `134-145`
   - Current title in index: `Episode About the Expansion of the Khalsa Panth`
   - Editorial short label: `Expansion of the Khalsa`
   - Why included:
     - completes the founding movement instead of stopping at ceremony alone
     - gives social spread and collective form, not just origin myth

3. Episode 17 — Anandpur Sahib
   - Pages: `146-151`
   - Current title in index: `Episode About Anandpur Sahib`
   - Editorial short label: `Anandpur`
   - Why included:
     - gives place, atmosphere, and growth context
     - transitions from formation into lived Khalsa society

4. Episode 18 — Battle at Anandpur Sahib
   - Pages: `152-163`
   - Current title in index: `Episode About the Battle at Anandpur Sahib`
   - Editorial short label: `Battle at Anandpur`
   - Why included:
     - raises narrative stakes
     - closes with direct movement into Chamkaur, creating a strong next-step hook
   - Notable page anchors:
     - `152`: episode opening, Mata Gujri / Guru / Khalsa tension and battle setup
     - `163`: manual editorial bridge into Chamkaur

Reader-facing product shape
- Front-door card on `/library/panth-prakash-english`:
  - Label: `Starter Arc`
  - Title: `Khalsa to Anandpur`
  - Body: `Begin with the formation of the Khalsa, watch the Panth expand, and follow the narrative pressure into Anandpur and the battle that leads toward Chamkaur.`
  - CTA: `Start this arc`
  - Start page: `128`

- Slice overview block should show:
  - `4 reviewed sections`
  - `Pages 128-163`
  - `Volume 1`
  - trust chips:
    - `Verified source`
    - `English translation`
    - `OCR draft with editorial repair`
    - `Full page coverage preserved`

Editorial structure required for the starter slice
- Every included episode needs:
  - clean editorial title
  - one-line orientation summary
  - exact page start/end
  - trust marker state
- Opening page of each episode should show an episode header block before body text.
- Manually rescued pages inside the slice should be kept visible as editorial summaries, not hidden.
- The slice overview should present the four sections as clickable cards in sequence.

Trust markers to display
1. Source provenance
   - `Verified archive.org English translation`
   - translator attribution: `Kulwant Singh`
2. Text condition
   - one of:
     - `OCR draft`
     - `Editorially repaired`
     - `Reviewed`
3. Coverage honesty
   - `Page-complete reading path; rough pages stay labeled instead of removed`
4. Structure honesty
   - `Episode boundaries extracted from OCR headings and still reviewable`

Starter-slice section summaries
- Episode 15 / Creation of the Khalsa
  - Summary: `The Guru selects and initiates the first five beloved ones, breaks caste distinctions, and frames the Khalsa as a disciplined collective order rather than a loose devotional crowd.`
- Episode 16 / Expansion of the Khalsa
  - Summary: `The new order spreads outward through local gathering, initiation, ardas, and distributed responsibility, showing how the Khalsa becomes a lived social form.`
- Episode 17 / Anandpur
  - Summary: `Anandpur appears as the lived center of Khalsa life, where preaching, provisions, refuge, and growing confidence gather around the Panth.`
- Episode 18 / Battle at Anandpur
  - Summary: `Pressure intensifies around Anandpur; criticism, loyalty, force, and political pressure sharpen until the narrative opens directly toward Chamkaur.`

Pages that need explicit premium handling inside the slice
- `128`
  - keep episode-opening treatment strong
  - preserve Panj Piare and initiation setup as reader-facing anchors
- `133`
  - surface as `Editorial bridge` or `Repaired page`
  - use it to explain the Guru/Panj mutuality and delegated Khalsa authority
- `146`
  - treat as place-establishing transition page
- `152`
  - treat as battle-opening page with a stronger section preface
- `163`
  - surface as `Editorial bridge to Chamkaur`
  - use it as the explicit handoff to the next arc

What is out of scope for this slice
- Full Panth Prakash review pass
- Punjabi alignment
- Universal chapter cleanup for all 169 episodes
- Rewriting the full episode index
- Claiming the whole work is fully reviewed

Implementation notes for later, not part of this spec
- Add a `starterSlices` field to work metadata in schema v2.
- Add per-section summaries and trust states instead of deriving all display copy from raw page titles.
- Add page-level review labels so pages `133` and `163` can surface as repaired anchors.

Definition of done
- `/library/panth-prakash-english` can present a single credible starter path with exact pages and honest trust signals.
- A reader can move through pages `128-163` with visible section boundaries and without losing page/source continuity.
- The product can say this slice is reviewed or editorially framed without implying the full corpus is finished.
