import { expect, test } from 'vitest'
import { homeArtworkCatalog } from '../data/homeArtworkCatalog'
import { ECLIPSE_ARTWORK, getHomeArtworkImageStyle } from './homeArtwork'

test('Eclipse keeps its original dimensions and focal metadata while Home shows its full composition', () => {
  expect(ECLIPSE_ARTWORK).toMatchObject({ width: 1178, height: 1280, focalPosition: { x: 0.5, y: 0.19 } })
  expect(getHomeArtworkImageStyle(ECLIPSE_ARTWORK)).toEqual({
    objectFit: 'contain', objectPosition: '50% 50%', backgroundColor: ECLIPSE_ARTWORK.mat,
  })
})

test('all fifteen Home artworks contain their complete original composition with their own mat', () => {
  const assets = [ECLIPSE_ARTWORK, ...homeArtworkCatalog]
  expect(assets).toHaveLength(15)
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
