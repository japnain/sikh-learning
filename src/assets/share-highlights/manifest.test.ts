import { describe, expect, it } from 'vitest'
import {
  shareHighlightAssets,
  shareHighlightHukamnamaAssets,
  shareHighlightLineAssets,
} from './manifest'

describe('Hukamnama artwork curation', () => {
  it('offers only explicitly reviewed neutral artwork beside a Hukamnama', () => {
    expect(shareHighlightHukamnamaAssets.map(asset => asset.id)).toEqual([
      'quiet-parchment',
      'emerald-mist',
      'indigo-rain',
      'rose-dawn',
      'copper-earth',
      'river-stone',
      'night-gold',
      'sage-canopy',
      'monsoon-blue',
      'sandstone-light',
      'plum-ink',
      'silver-dusk',
    ])
    expect(new Set(shareHighlightHukamnamaAssets.map(asset => asset.src)).size).toBe(12)
    expect(new Set(shareHighlightHukamnamaAssets.map(asset => asset.thumbnail)).size).toBe(12)

    shareHighlightHukamnamaAssets.forEach(asset => {
      expect(asset).toMatchObject({
        original: { width: 1080, height: 1920, orientation: 'portrait' },
        normalized: { width: 1080, height: 1920, orientation: 'portrait' },
        orientationCorrection: 'none',
        textSafeZone: { x: 0.08, y: 0.18, width: 0.84, height: 0.62 },
        storyProfile: {
          mode: 'portrait-bleed',
          manuscriptTreatment: 'art-frame',
        },
        overlayTone: 'light',
        hukamnamaUse: { status: 'approved-neutral' },
      })
      expect(asset.storyProfile.protectedSubject).toBeUndefined()
      expect(asset.hukamnamaUse?.provenance).toContain('no source images were supplied')
      expect(asset.hukamnamaUse?.displayName.en.trim()).not.toBe('')
      expect(asset.hukamnamaUse?.displayName.pa.trim()).not.toBe('')
      expect(asset.hukamnamaUse?.displayName.hi.trim()).not.toBe('')
      expect(asset.hukamnamaUse?.description.en.trim()).not.toBe('')
      expect(asset.hukamnamaUse?.description.pa.trim()).not.toBe('')
      expect(asset.hukamnamaUse?.description.hi.trim()).not.toBe('')
    })

    expect(shareHighlightHukamnamaAssets[0]?.hukamnamaUse?.createdDate).toBe('2026-08-11')
    expect(shareHighlightHukamnamaAssets.slice(1).every(
      asset => asset.hukamnamaUse?.createdDate === '2026-08-15'
    )).toBe(true)
  })

  it('keeps unreviewed historical and conflict imagery out of the Hukamnama set', () => {
    const availableIds = new Set(shareHighlightHukamnamaAssets.map(asset => asset.id))
    const unreviewedIds = shareHighlightAssets
      .filter(asset => !('hukamnamaUse' in asset))
      .map(asset => asset.id)

    expect(unreviewedIds.length).toBeGreaterThan(0)
    expect(unreviewedIds).toContain('waterside-temple')
    unreviewedIds.forEach(id => {
      expect(availableIds.has(id)).toBe(false)
      expect(shareHighlightAssets.find(asset => asset.id === id)?.storyProfile.manuscriptTreatment)
        .toBeUndefined()
    })
  })

  it('keeps the classic line-card gallery focused while expanding Hukamnamas', () => {
    expect(shareHighlightLineAssets).toHaveLength(15)
    expect(shareHighlightLineAssets.at(-1)?.id).toBe('quiet-parchment')
    expect(shareHighlightLineAssets.some(asset => asset.id === 'emerald-mist')).toBe(false)
    expect(shareHighlightAssets).toHaveLength(26)
  })
})
