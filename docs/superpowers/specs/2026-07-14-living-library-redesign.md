# NaamRas Living Library Redesign

Date: 2026-07-14
Status: Approved for implementation

## Goal

Create one coherent, world-class reading experience across Home, Read, the focused
passage reader, and Saved. The product should feel art-led at discovery moments and
quiet while scripture is being read.

## Product Principles

- Preserve every existing search mode, route, deep link, offline/degraded state,
  progress record, saved item, and accessibility contract.
- Keep the current React/CSS architecture, data model, and dependencies.
- Prioritize mobile widths from 375 to 430 pixels, then provide a restrained desktop
  layout with a 42-48rem reading measure.
- Use artwork for orientation and collection context, never behind scripture.
- At large text and 200% zoom, natural reflow and complete controls take priority over
  default-size viewport composition targets.

## Home

The hierarchy is:

1. Daily Hukamnama in the existing eclipse-art hero.
2. Daily Nitnem and the existing continue/resume behavior.
3. Recent Saved content and the existing profile metrics.

The eclipse artwork becomes a semantic image with intrinsic dimensions in a stable,
responsive frame. Mobile uses a 4:5 crop with the focal point near center 18%; desktop
uses a bounded editorial banner. There is no parallax, large blur, or fixed viewport
height. The hero is the only eagerly loaded image.

Hukamnama always displays its actual date and source state. Cached older content is
identified as available offline from its date and is not described as today's reading.
Empty lower modules collapse into one useful next action rather than several empty
containers.

## Read

Read is a discovery workspace, not a marketing page. It has a literal `Read` heading,
the existing unified search input, a compact Today/Continue area, and a persistent
tablist for `Banis`, `Sources`, and `Books`.

The current search engine remains authoritative. App-route matches retain priority and
Gurbani results remain grouped by the existing search types. Search results replace the
active tab panel while the tablist remains visible. Clearing a query restores the prior
tab and input focus. Existing URL query hydration remains intact. Debounced meaningful
updates announce result counts, empty results, and offline limitations without moving
focus.

## Focused Reader

The focused layout applies only to `/study` and `/study/...` routes. It removes the
global bottom navigation while retaining a persistent labeled exit, source identity,
and a deterministic `/banis` fallback for direct or refreshed entries.

Context and reading settings become compact, state-revealing disclosures with at least
44px targets. At 375px and default text size, Gurbani should begin within the first
650px. Gurmukhi remains selectable and carries language metadata; translations and
transliterations remain clearly identified. Loading, error, and offline states retain
the same route and data behavior.

## Artwork Map

- Home: existing eclipse artwork.
- Read overview: Golden Temple painting, full 4:5 presentation.
- Banis: floral Guru Nanak painting, full 4:5 presentation.
- Books/Panth Prakash: historical court scene, full 4:5 presentation.
- Saved: narrative mural, full 16:9 presentation after correcting only the camera's
  90-degree orientation.

Contextual images load lazily with intrinsic dimensions and stable containers. Layouts
remain complete if an image fails. Informative images use descriptions limited to what
is visibly present; decorative crops use empty alt text. No unverified provenance or
identity claim appears in the interface.

## Visual System

- Fonts: existing Cormorant Garamond, Plus Jakarta Sans, and Noto Serif Gurmukhi.
- Colors: warm ivory, ink, teal, and restrained gold.
- Radius: 8px maximum.
- No gradients, purple-led palette, decorative blobs, nested cards, oversized marketing
  copy, or unrequested motion.
- Primary controls keep visible focus and at least 44px touch targets.

## Acceptance Criteria

- Focused Home, Banis, Study, and Library tests pass.
- Production build passes.
- Visual checks at 375x812, 430x932, and desktop show no overlap or clipped text.
- Keyboard focus, reduced motion, 200% zoom, image failure, and offline/stale states
  remain usable.
- Art never reduces the primary search or reading width and never appears behind
  scripture.

## Non-goals

- No backend, schema, synchronization, or content-model changes.
- No replacement search taxonomy or ranking algorithm.
- No new analytics, generated fallback metrics, dependencies, or artwork alteration.

## Review Record

The sequential Skeptic, Constraint Guardian, and User Advocate reviews each required
revisions. Their concerns were incorporated into this document. The Integrator/Arbiter
approved the consolidated design with no remaining design-gate blockers.
