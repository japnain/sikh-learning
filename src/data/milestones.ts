import type { Milestone } from '../types'

export const MILESTONES: Milestone[] = [
  {
    id: 'first-symbol-mastered',
    title: 'First Symbol Mastered',
    gurmukhi: 'ੴ',
    description: 'You locked in your first Gurbani symbol.',
    earnedMessage: 'A single symbol becoming familiar is how reading stops feeling distant.',
  },
  {
    id: 'five-symbols-mastered',
    title: 'Five Symbols Mastered',
    gurmukhi: 'ਸਤਿ',
    description: 'Five symbols are now in your active reading memory.',
    earnedMessage: 'The script is starting to feel like a system instead of a wall.',
  },
  {
    id: 'all-symbols-mastered',
    title: 'Script Foundations Complete',
    gurmukhi: 'ਗੁਰਮੁਖਿ',
    description: 'You have touched every symbol in the core learning library.',
    earnedMessage: 'You now have enough script coverage to stay in real Gurbani much more often.',
  },
  {
    id: 'first-module-complete',
    title: 'First Module Complete',
    gurmukhi: 'ਵਾਹਿਗੁਰੂ',
    description: 'You finished your first Learn module.',
    earnedMessage: 'Momentum matters more than intensity right now. Keep the chain alive.',
  },
  {
    id: 'program-1-complete',
    title: 'Program 1 Complete',
    gurmukhi: 'ਪੜ੍ਹਨਾ',
    description: 'You completed Start Reading.',
    earnedMessage: 'You now have enough script confidence to stay with live lines instead of isolated drills.',
  },
  {
    id: 'program-2-complete',
    title: 'Program 2 Complete',
    gurmukhi: 'ਲਹਿਰ',
    description: 'You completed Build Fluency.',
    earnedMessage: 'Your reading rhythm is getting steadier. The line should feel less choppy now.',
  },
  {
    id: 'program-3-complete',
    title: 'Program 3 Complete',
    gurmukhi: 'ਸਮਝ',
    description: 'You completed Understand Gurbani.',
    earnedMessage: 'You are no longer just decoding. Meaning patterns are starting to hold together.',
  },
  {
    id: 'first-journey-complete',
    title: 'First Journey Complete',
    gurmukhi: 'ਰਾਹੁ',
    description: 'You finished your first guided bani journey.',
    earnedMessage: 'This is what compounding practice looks like: letters, meaning, and scripture flow together.',
  },
  {
    id: 'first-word-saved',
    title: 'First Word Saved',
    gurmukhi: 'ਨਾਮੁ',
    description: 'You started building a personal Gurbani vocabulary bank.',
    earnedMessage: 'Saving words is how recognition turns into recall.',
  },
  {
    id: 'ten-vocab-words',
    title: 'Ten Vocabulary Words',
    gurmukhi: 'ਗਿਆਨੁ',
    description: 'Your saved vocabulary bank reached ten words or phrases.',
    earnedMessage: 'You now have enough personal vocabulary to start spotting repetition across banis.',
  },
  {
    id: 'streak-7-days',
    title: 'Seven-Day Streak',
    gurmukhi: 'ਨਿਤ',
    description: 'You practiced for seven straight days.',
    earnedMessage: 'A week of steady practice changes how the script feels in your eyes.',
  },
  {
    id: 'streak-30-days',
    title: 'Thirty-Day Streak',
    gurmukhi: 'ਅਭਿਆਸ',
    description: 'You held a month-long learning streak.',
    earnedMessage: 'This is the kind of consistency that makes Gurbani feel familiar instead of borrowed.',
  },
  {
    id: 'first-grammar-note-seen',
    title: 'First Grammar Note',
    gurmukhi: 'ਬੂਝ',
    description: 'You opened your first grammar note.',
    earnedMessage: 'Now the language can start making sense instead of only being memorized.',
  },
  {
    id: 'first-theme-path-started',
    title: 'First Theme Path Started',
    gurmukhi: 'ਧਾਰਾ',
    description: 'You started a thematic learning path.',
    earnedMessage: 'You are moving from isolated lessons into connected ideas and recurring language.',
  },
  {
    id: 'first-word-family-mastered',
    title: 'First Word Family Mastered',
    gurmukhi: 'ਮੂਲ',
    description: 'You completed your first word-family module.',
    earnedMessage: 'This is where vocabulary starts branching instead of staying one word at a time.',
  },
]

export const MILESTONE_BY_ID = Object.fromEntries(
  MILESTONES.map(milestone => [milestone.id, milestone])
) as Record<string, Milestone>
