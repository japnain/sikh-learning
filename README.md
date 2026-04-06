# Nitnem

Nitnem is a mobile-first Gurbani reading and learning app.

Its product direction is simple:

Read Gurbani daily. Understand it better. Grow into it steadily.

## Product Shape

Nitnem is designed around three connected pillars:

- `Read`: Banis, hukamnama, scripture browsing, bookmarks, and a cleaner mobile reader
- `Understand`: translation controls, transliteration, source context, word lookup, and saved phrases
- `Grow`: Learn, review, mastery tracking, practice streaks, and Gurbani bridge exercises

The goal is not to copy every advanced desktop scripture tool. The goal is to be a trustworthy daily-use mobile companion for both newer readers and regular readers.

## Current Focus

- premium, calm reading experience on mobile
- honest product behavior: no fake audio controls, no misleading data affordances
- stronger learning loops tied directly back into real Gurbani
- user-owned value in Saved: bookmarks, words, phrases, progress

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- BaniDB v2 API

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run build
npx vitest run
```

## Data

Scripture and translation data is sourced from BaniDB. Ambient audio is bundled locally. Recitation playback remains intentionally unavailable until a real working audio source exists.
