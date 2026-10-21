import type { ReactNode } from 'react'

export type NavigationGlyphProps = { active: boolean }

function GlyphFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

// A courtyard facade: an inked central wall, open arch, low wings and onion roof.
export function NavHomeGlyph({ active }: NavigationGlyphProps) {
  return (
    <GlyphFrame>
      <path
        d="M3 16h5v8.5H3ZM20 16h5v8.5h-5Z"
        fill="currentColor"
        fillOpacity={active ? 0.35 : 0.23}
      />
      <path
        d="M8 12h12v12.5H8ZM11 24.5v-6c0-1.65 1.45-2.95 3-4 1.55 1.05 3 2.35 3 4v6Z"
        fill="currentColor"
        fillRule="evenodd"
        stroke="none"
      />
      <path d="M8 24.5V12h12v12.5" />
      <path
        d="M8.25 11.75C6.9 9.45 8.45 7.65 11.15 6c1.35-.8 2.2-1.6 2.85-2.75.65 1.15 1.5 1.95 2.85 2.75 2.7 1.65 4.25 3.45 2.9 5.75Z"
        fill="currentColor"
        fillOpacity={active ? 0.35 : 0.23}
      />
      <path d="M7.25 12h13.5M2.5 24.5h23" />
    </GlyphFrame>
  )
}

// Broad manuscript pages sit above a solid binding, with a distinct open spine.
export function NavReadGlyph({ active }: NavigationGlyphProps) {
  return (
    <GlyphFrame>
      <path
        d="M2.75 7.5h.75V19c3.9-1.25 7.2-.35 10.5 1.9 3.3-2.25 6.6-3.15 10.5-1.9V7.5h.75v14.75c-4.25-1.25-7.4-.35-11.25 2-3.85-2.35-7-3.25-11.25-2Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M3.5 5.5c3.9-1.25 7.2-.35 10.5 1.9 3.3-2.25 6.6-3.15 10.5-1.9V19c-3.9-1.25-7.2-.35-10.5 1.9-3.3-2.25-6.6-3.15-10.5-1.9Z"
        fill="currentColor"
        fillOpacity={active ? 0.32 : 0.22}
      />
      <path d="M14 7.4v13.5M6.75 11c1.3-.05 2.55.3 3.75.95M17.5 11.95c1.2-.65 2.45-1 3.75-.95M2.75 8.5v13.75c4.25-1.25 7.4-.35 11.25 2 3.85-2.35 7-3.25 11.25-2V8.5" />
    </GlyphFrame>
  )
}

// An inked selvedge and a broad turned corner keep the ribbon light and legible.
export function NavSavedGlyph({ active }: NavigationGlyphProps) {
  return (
    <GlyphFrame>
      <path d="M7.75 3.5h7V9h5.5v15.5L14 20.25 7.75 24.5Z"
        fill="currentColor" fillOpacity={active ? 0.32 : 0.22} stroke="none" />
      <path d="M7.75 3.5h2.75v19.13l-2.75 1.87Z" fill="currentColor" stroke="none" />
      <path d="M7.75 3.5h7l5.5 5.5v15.5L14 20.25 7.75 24.5ZM14.75 3.5V9h5.5" />
    </GlyphFrame>
  )
}

// Four courtyard windows echo the paintings' jaali panels and read as a menu.
export function NavMoreGlyph({ active }: NavigationGlyphProps) {
  return (
    <GlyphFrame>
      <path d="M4 12V8c0-1.7 2.25-3.3 4-4 1.75.7 4 2.3 4 4v4Z" fill="currentColor" />
      <path
        d="M16 12V8c0-1.7 2.25-3.3 4-4 1.75.7 4 2.3 4 4v4ZM4 24v-4c0-1.7 2.25-3.3 4-4 1.75.7 4 2.3 4 4v4ZM16 24v-4c0-1.7 2.25-3.3 4-4 1.75.7 4 2.3 4 4v4Z"
        fill="currentColor" fillOpacity={active ? 0.32 : 0.22} />
    </GlyphFrame>
  )
}
