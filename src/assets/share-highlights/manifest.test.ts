import { describe, expect, it } from 'vitest'
import {
  shareHighlightAssets,
  shareHighlightHukamnamaAssets,
} from './manifest'

describe('Hukamnama artwork curation', () => {
  it('offers only explicitly reviewed neutral artwork beside a Hukamnama', () => {
    expect(shareHighlightHukamnamaAssets.map(asset => asset.id)).toEqual([
      'quiet-parchment',
    ])
    expect(shareHighlightHukamnamaAssets[0]?.hukamnamaUse).toMatchObject({
      status: 'approved-neutral',
      createdDate: '2026-08-11',
    })
    expect(shareHighlightHukamnamaAssets[0]?.hukamnamaUse.provenance).toContain(
      'no source images were supplied'
    )
  })

  it('keeps unreviewed historical and conflict imagery out of the Hukamnama set', () => {
    const availableIds = new Set(shareHighlightHukamnamaAssets.map(asset => asset.id))
    const unreviewedIds = shareHighlightAssets
      .filter(asset => !('hukamnamaUse' in asset))
      .map(asset => asset.id)

    expect(unreviewedIds.length).toBeGreaterThan(0)
    expect(unreviewedIds).toContain('waterside-temple')
    unreviewedIds.forEach(id => expect(availableIds.has(id)).toBe(false))
  })
})
