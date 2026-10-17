import { useRef, useState, type MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import ShareHighlightSheet, { type ShareHighlightContent } from '../../../src/features/shareHighlight/ShareHighlightSheet'
import { shareHighlightHukamnamaAssets } from '../../../src/assets/share-highlights/manifest'
import type { ShareHighlightPassageLine, ShareHighlightStoryPngSet } from '../../../src/features/shareHighlight/types'
import type { UiLocale } from '../../../src/types'
import { exportShareHighlightHukamnamaPng } from '../../../src/features/shareHighlight/renderer'
import '../../../src/styles/tokens.css'
import '../../../src/index.css'
import '../../../src/styles/foundations.css'

// Same complete, ordered Ang 683 fixture as renderer.test.ts. Short and medium
// are explicitly excerpts; no synthetic or repeated scripture is introduced.
const lines: ShareHighlightPassageLine[] = [
  { id: 'ang-683-1', gurmukhi: 'ਧਨਾਸਰੀ ਮਹਲਾ ੫ ਘਰੁ ੧੨', meaning: 'Dhanaasaree, Fifth Mehl, Twelfth House:', isHeader: true },
  { id: 'ang-683-2', gurmukhi: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥', meaning: 'One Universal Creator God. By The Grace Of The True Guru:' },
  { id: 'ang-683-3', gurmukhi: 'ਬੰਦਨਾ ਹਰਿ ਬੰਦਨਾ ਗੁਣ ਗਾਵਹੁ ਗੋਪਾਲ ਰਾਇ ॥ ਰਹਾਉ ॥', meaning: 'I bow in reverence to the Lord, I bow in reverence. I sing the Glorious Praises of the Lord, my King. ||Pause||' },
  { id: 'ang-683-4', gurmukhi: 'ਵਡੈ ਭਾਗਿ ਭੇਟੇ ਗੁਰਦੇਵਾ ॥', meaning: 'By great good fortune, one meets the Divine Guru.' },
  { id: 'ang-683-5', gurmukhi: 'ਕੋਟਿ ਪਰਾਧ ਮਿਟੇ ਹਰਿ ਸੇਵਾ ॥੧॥', meaning: 'Millions of sins are erased by serving the Lord. ||1||' },
  { id: 'ang-683-6', gurmukhi: 'ਚਰਨ ਕਮਲ ਜਾ ਕਾ ਮਨੁ ਰਾਪੈ ॥', meaning: "One whose mind is imbued with the Lord's lotus feet" },
  { id: 'ang-683-7', gurmukhi: 'ਸੋਗ ਅਗਨਿ ਤਿਸੁ ਜਨ ਨ ਬਿਆਪੈ ॥੨॥', meaning: 'is not afflicted by the fire of sorrow. ||2||' },
  { id: 'ang-683-8', gurmukhi: 'ਸਾਗਰੁ ਤਰਿਆ ਸਾਧੂ ਸੰਗੇ ॥', meaning: 'He crosses over the world-ocean in the Saadh Sangat, the Company of the Holy.' },
  { id: 'ang-683-9', gurmukhi: 'ਨਿਰਭਉ ਨਾਮੁ ਜਪਹੁ ਹਰਿ ਰੰਗੇ ॥੩॥', meaning: "He chants the Name of the Fearless Lord, and is imbued with the Lord's Love. ||3||" },
  { id: 'ang-683-10', gurmukhi: 'ਪਰ ਧਨ ਦੋਖ ਕਿਛੁ ਪਾਪ ਨ ਫੇੜੇ ॥', meaning: 'One who does not steal the wealth of others, who does not commit evil deeds or sinful acts' },
  { id: 'ang-683-11', gurmukhi: 'ਜਮ ਜੰਦਾਰੁ ਨ ਆਵੈ ਨੇੜੇ ॥੪॥', meaning: '- the Messenger of Death does not even approach him. ||4||' },
  { id: 'ang-683-12', gurmukhi: 'ਤ੍ਰਿਸਨਾ ਅਗਨਿ ਪ੍ਰਭਿ ਆਪਿ ਬੁਝਾਈ ॥', meaning: 'God Himself quenches the fires of desire.' },
  { id: 'ang-683-13', gurmukhi: 'ਨਾਨਕ ਉਧਰੇ ਪ੍ਰਭ ਸਰਣਾਈ ॥੫॥੧॥੫੫॥', meaning: "O Nanak, in God's Sanctuary, one is saved. ||5||1||55||" },
]

type Kind = 'short' | 'medium' | 'long'
const counts: Record<Kind, number> = { short: 3, medium: 7, long: 13 }

function contentFor(kind: Kind): ShareHighlightContent {
  const passageLines = lines.slice(0, counts[kind]).map(line => ({
    ...line,
    meaning: kind === 'short' ? null : line.meaning,
  }))
  return {
    gurmukhi: passageLines.map(line => line.gurmukhi).join('\n'),
    meaning: kind === 'short' ? undefined : passageLines.map(line => line.meaning).join('\n'),
    sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 683',
    passageLines,
    passageKind: 'daily-hukamnama',
    initialShowMeaning: kind !== 'short',
    initialShowTransliteration: false,
    seriesLabel: kind === 'long' ? 'Hukamnama' : 'Hukamnama · excerpt',
    dateLabel: '18 July 2026',
    sourcePath: '/study?ang=683',
    provenance: { scripture: 'Sri Guru Granth Sahib Ji', translationLanguage: 'en', dateIso: '2026-07-18' },
  }
}

async function serializeExport(result: ShareHighlightStoryPngSet) {
  const page = result.pages[0]!
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read QA export.'))
    reader.readAsDataURL(page.blob)
  })
  return {
    pageCount: result.pages.length,
    width: page.width,
    height: page.height,
    bytes: page.blob.size,
    mime: page.blob.type,
    orderedIds: page.selection.includedSourceLineIds,
    layout: page.layout,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
  }
}

// Test-only access for browser/font checks. Callers may supply verified language
// pairs; this harness does not fabricate scripture or its translations.
Object.assign(window, {
  hukamnamaQA: {
    assetIds: shareHighlightHukamnamaAssets.map(artwork => artwork.id),
    fixture: contentFor,
    renderCase: async ({ kind = 'long', artworkId = 'interior-audience', lines: providedLines }: {
      kind?: Kind
      artworkId?: string | null
      lines?: ShareHighlightPassageLine[]
    } = {}) => {
      const fixture = contentFor(kind)
      const artwork = artworkId === null ? null : shareHighlightHukamnamaAssets.find(candidate => candidate.id === artworkId)
      if (artworkId !== null && !artwork) throw new Error('Choose one of the existing 14 artwork IDs, or null for plain.')
      const result = await exportShareHighlightHukamnamaPng({
        artwork,
        content: {
          lines: providedLines ?? fixture.passageLines!,
          sourceLabel: fixture.sourceLabel,
          seriesLabel: fixture.seriesLabel!,
          dateLabel: fixture.dateLabel,
        },
      })
      return { ...await serializeExport(result), purpose: 'hukamnama-fixture', kind, artworkId }
    },
    renderTypographySample: async ({ script }: { script: 'pa' | 'hi' }) => {
      if (script !== 'pa' && script !== 'hi') throw new Error('Typography sample script must be pa or hi.')
      const sample = script === 'pa' ? 'ਪੰਜਾਬੀ ਲਿਖਤ ਦੀ ਜਾਂਚ' : 'देवनागरी अक्षर जाँच'
      const result = await exportShareHighlightHukamnamaPng({
        artwork: null,
        content: {
          lines: [{ id: `typography-${script}`, gurmukhi: 'ਪੰਜਾਬੀ ਲਿਖਤ ਦੀ ਜਾਂਚ', meaning: sample }],
          sourceLabel: 'Bundled font verification · Not scripture',
          seriesLabel: 'Typography test',
        },
      })
      const fontFamily = script === 'pa' ? 'Noto Serif Gurmukhi' : 'Noto Sans Devanagari'
      return {
        ...await serializeExport(result),
        purpose: 'typography-test-not-scripture',
        script,
        sample,
        fontFamily,
        fontLoaded: document.fonts.check(`32px "${fontFamily}"`, sample),
      }
    },
  },
})

export default function Harness() {
  const [kind, setKind] = useState<Kind>('short')
  const [locale, setLocale] = useState<UiLocale>('en')
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const openComposer = (event: MouseEvent<HTMLButtonElement>) => {
    opener.current = event.currentTarget
    setOpen(true)
  }
  const closeComposer = () => {
    setOpen(false)
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }))
  }

  return (
    <main style={{ padding: 'max(100px, env(safe-area-inset-top)) 20px 40px', maxWidth: 640, marginInline: 'auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Hukamnama sharing QA</h1>
      <p>Production composer, renderer, fonts, and all {shareHighlightHukamnamaAssets.length} original backgrounds.</p>
      <label style={{ display: 'block', marginBlock: 20 }}>
        Interface language
        <select aria-label="Interface language" value={locale} disabled={open}
          onChange={event => setLocale(event.target.value as UiLocale)}
          style={{ display: 'block', minHeight: 48, minWidth: 180, marginTop: 8, padding: '8px 12px', border: '1px solid currentColor', borderRadius: 8 }}>
          <option value="en">English</option>
          <option value="pa">ਪੰਜਾਬੀ</option>
          <option value="hi">हिन्दी</option>
        </select>
      </label>
      <div role="group" aria-label="Reading length" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBlock: 20 }}>
        {(['short', 'medium', 'long'] as const).map(value => (
          <button key={value} type="button" aria-label={`${value[0].toUpperCase() + value.slice(1)} ${value === 'long' ? 'complete' : 'excerpt'}`} disabled={open} onClick={() => setKind(value)}
            style={{ minHeight: 48, padding: '8px 16px', border: '1px solid currentColor', borderRadius: 8 }}>
            {value[0].toUpperCase() + value.slice(1)} {value === 'long' ? 'complete' : 'excerpt'}
          </button>
        ))}
      </div>
      <p aria-live="polite">{`Selected ${kind}: ${counts[kind]} ordered lines${kind === 'short' ? ', Gurmukhi only.' : ', Gurmukhi and English meaning.'}`}</p>
      <button type="button" onClick={openComposer} style={{ minHeight: 48, padding: '8px 16px', marginBlock: 20, border: '1px solid currentColor', borderRadius: 8 }}>
        Open share composer
      </button>
      {open && <ShareHighlightSheet key={`${kind}-${locale}`} open onClose={closeComposer} content={contentFor(kind)} initialArtworkId="interior-audience" locale={locale} />}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Harness />)
