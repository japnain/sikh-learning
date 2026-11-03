import { expect, test } from 'vitest'
import { homeArtworkCatalog } from '../data/homeArtworkCatalog'
import { HOME_ARTWORK_COLLECTION_IDS } from '../store/homeArtwork'
import { ECLIPSE_ARTWORK, getHomeArtworkImageStyle } from './homeArtwork'
import { getHomeArtworkComposition } from './homeArtworkComposition'

test('Eclipse keeps its original dimensions and focal metadata while Home shows its full composition', () => {
  expect(ECLIPSE_ARTWORK).toMatchObject({ width: 1178, height: 1280, focalPosition: { x: 0.5, y: 0.19 } })
  expect(getHomeArtworkImageStyle(ECLIPSE_ARTWORK)).toEqual({
    objectFit: 'contain', objectPosition: '50% 50%', backgroundColor: ECLIPSE_ARTWORK.mat,
  })
})

test('all Home artworks contain their complete original composition with their own mat', () => {
  const assets = [ECLIPSE_ARTWORK, ...homeArtworkCatalog]
  expect(assets).toHaveLength(HOME_ARTWORK_COLLECTION_IDS.length + 1)
  const originalMetadata = JSON.stringify(assets)

  for (const asset of assets) {
    expect(getHomeArtworkImageStyle(asset)).toEqual({
      objectFit: 'contain', objectPosition: '50% 50%', backgroundColor: asset.mat,
    })
  }

  expect(JSON.stringify(assets)).toBe(originalMetadata)
})

test.each(['floral-teacher-mural', 'gurmukhi-floral-medallion'])(
  '%s preserves borders beyond its approximate protected subject bounds',
  (id) => {
    const asset = homeArtworkCatalog.find(entry => entry.id === id)!
    expect(asset.protectedSubject?.bounds.width).toBeLessThan(1)
    expect(asset.protectedSubject?.bounds.height).toBeLessThan(1)
    expect(getHomeArtworkImageStyle(asset)).toMatchObject({ objectFit: 'contain', objectPosition: '50% 50%' })
  },
)

test.each([ECLIPSE_ARTWORK, ...homeArtworkCatalog])(
  '$id retains at least three source pixels per CSS pixel at its largest Home size',
  (asset) => {
    for (const dark of [false, true]) {
      const { frameStyle } = getHomeArtworkComposition(asset, dark)
      const width = Number.parseFloat(String(frameStyle.maxWidth))
      const ratio = Number(frameStyle.aspectRatio)
      const height = width / ratio

      expect(Number.isFinite(width)).toBe(true)
      expect(Number.isFinite(height)).toBe(true)
      expect(Number.isFinite(ratio)).toBe(true)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(ratio).toBeGreaterThan(0)
      expect(ratio).toBeCloseTo(asset.width / asset.height, 10)
      expect(asset.width / width).toBeGreaterThanOrEqual(3 - Number.EPSILON * 3)
      expect(asset.height / height).toBeGreaterThanOrEqual(3 - Number.EPSILON * 3)
    }
  },
)
