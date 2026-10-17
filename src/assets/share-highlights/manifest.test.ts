import { describe, expect, it } from 'vitest'
import {
  isShareHighlightHukamnamaAsset,
  shareHighlightAssets,
  shareHighlightHukamnamaAssetIds,
  shareHighlightHukamnamaAssets,
  type ShareHighlightAsset,
} from './manifest'

const expectedHukamnamaIds = [
  'court-mural',
  'interior-audience',
  'court-assembly',
  'fort-procession',
  'string-and-tabla',
  'devotional-interior',
  'waterside-temple',
  'miniature-collage',
  'rider-and-attendants',
  'falconer-on-horseback',
  'floral-teacher-mural',
  'golden-court-assembly',
  'gurmukhi-floral-medallion',
  'ceremonial-arms-display',
] as const

const expectedStoryPresentations = {
  'court-mural': ['protected-cover', 500, 'warm', 'contain'],
  'interior-audience': ['protected-cover', 520, 'warm', 'protected-cover'],
  'court-assembly': ['protected-cover', 500, 'cool', 'contain'],
  'fort-procession': ['protected-cover', 500, 'warm', 'contain'],
  'string-and-tabla': ['protected-cover', 500, 'cool', 'contain'],
  'devotional-interior': ['protected-cover', 500, 'warm', 'contain'],
  'waterside-temple': ['contain', 520, 'vivid', 'contain'],
  'miniature-collage': ['contain', 520, 'vivid', 'contain'],
  'rider-and-attendants': ['protected-cover', 423, 'cool', 'contain'],
  'falconer-on-horseback': ['protected-cover', 520, 'warm', 'contain'],
  'floral-teacher-mural': ['protected-cover', 520, 'pattern', 'protected-cover'],
  'golden-court-assembly': ['contain', 520, 'architectural', 'contain'],
  'gurmukhi-floral-medallion': ['protected-cover', 520, 'pattern', 'protected-cover'],
  'ceremonial-arms-display': ['protected-cover', 520, 'amber', 'protected-cover'],
} as const

const expectedReviewMatrix = {
  'court-mural': ['unresolved', 'unknown', 'unresolved'],
  'interior-audience': ['unresolved', 'unknown', 'unresolved'],
  'court-assembly': ['unresolved', 'unknown', 'unresolved'],
  'fort-procession': [
    'unresolved',
    'work-identified-file-unverified',
    'unresolved',
  ],
  'string-and-tabla': ['blocked', 'unknown', 'unresolved'],
  'devotional-interior': [
    'unresolved',
    'work-identified-file-unverified',
    'unresolved',
  ],
  'waterside-temple': [
    'blocked',
    'work-identified-file-unverified',
    'blocked',
  ],
  'miniature-collage': ['unresolved', 'unknown', 'unresolved'],
  'rider-and-attendants': ['unresolved', 'unknown', 'unresolved'],
  'falconer-on-horseback': [
    'unresolved',
    'work-identified-file-unverified',
    'unresolved',
  ],
  'floral-teacher-mural': ['unresolved', 'unknown', 'unresolved'],
  'golden-court-assembly': ['unresolved', 'unknown', 'unresolved'],
  'gurmukhi-floral-medallion': ['unresolved', 'unknown', 'unresolved'],
  'ceremonial-arms-display': ['unresolved', 'unknown', 'unresolved'],
} as const

function expectNormalizedPoint(point: { x: number; y: number }) {
  expect(point.x).toBeGreaterThanOrEqual(0)
  expect(point.x).toBeLessThanOrEqual(1)
  expect(point.y).toBeGreaterThanOrEqual(0)
  expect(point.y).toBeLessThanOrEqual(1)
}

function expectNormalizedRect(rect: {
  x: number
  y: number
  width: number
  height: number
}) {
  expectNormalizedPoint(rect)
  expect(rect.width).toBeGreaterThan(0)
  expect(rect.height).toBeGreaterThan(0)
  expect(rect.x + rect.width).toBeLessThanOrEqual(1)
  expect(rect.y + rect.height).toBeLessThanOrEqual(1)
}

describe('Hukamnama artwork catalog', () => {
  it('uses the exact ordered allowlist of fourteen existing share artworks', () => {
    expect(shareHighlightHukamnamaAssetIds).toEqual(expectedHukamnamaIds)
    expect(shareHighlightHukamnamaAssets.map(asset => asset.id)).toEqual(
      expectedHukamnamaIds
    )
    expect(new Set(shareHighlightHukamnamaAssetIds).size).toBe(14)
  })

  it('excludes generated quiet parchment while preserving the normal gallery', () => {
    const normalGalleryIds = shareHighlightAssets.map(asset => asset.id)
    const quietParchment = shareHighlightAssets.find(
      asset => asset.id === 'quiet-parchment'
    )

    expect(normalGalleryIds).toHaveLength(15)
    expect(normalGalleryIds).toContain('quiet-parchment')
    expect(shareHighlightHukamnamaAssets.map(asset => asset.id))
      .not.toContain('quiet-parchment')
    expect(quietParchment?.hukamnamaUse).toMatchObject({
      status: 'approved-neutral',
      createdDate: '2026-08-11',
    })
  })

  it('provides complete localized names and concise descriptions', () => {
    const locales = ['en', 'pa', 'hi'] as const

    for (const asset of shareHighlightHukamnamaAssets) {
      for (const locale of locales) {
        expect(asset.displayName[locale].trim()).not.toBe('')
        expect(asset.localizedDescription[locale].trim()).not.toBe('')
        expect(asset.localizedDescription[locale].length).toBeLessThan(160)
      }
    }

    expect(shareHighlightHukamnamaAssets[0]?.displayName).toEqual({
      en: 'Court mural',
      pa: 'ਦਰਬਾਰੀ ਭਿੱਤ-ਚਿੱਤਰ',
      hi: 'दरबारी भित्तिचित्र',
    })
    expect(
      shareHighlightHukamnamaAssets.find(asset => asset.id === 'waterside-temple')
        ?.displayName
    ).toEqual({
      en: 'Waterside temple',
      pa: 'ਸਰੋਵਰ ਕੰਢੇ ਧਾਰਮਿਕ ਸਥਾਨ',
      hi: 'सरोवर किनारे धार्मिक स्थल',
    })
  })

  it('keeps every enabled treatment and protected-subject profile valid', () => {
    for (const asset of shareHighlightHukamnamaAssets) {
      expect(asset.original.width).toBeGreaterThan(0)
      expect(asset.original.height).toBeGreaterThan(0)
      expect(asset.normalized.width).toBeGreaterThan(0)
      expect(asset.normalized.height).toBeGreaterThan(0)
      expectNormalizedPoint(asset.focalPosition)
      expectNormalizedRect(asset.textSafeZone)

      const profile = asset.storyProfile
      expect(profile.focalPosition).toBeDefined()
      expectNormalizedPoint(profile.focalPosition!)
      expect(profile.protectedSubject).toBeDefined()
      expectNormalizedRect(profile.protectedSubject!.bounds)
      expect(['keep-visible', 'keep-clear-of-text'])
        .toContain(profile.protectedSubject!.intent)
      if (profile.mode === 'landscape-hero') {
        expect(profile.heroHeightFraction).toBeGreaterThanOrEqual(0.24)
        expect(profile.heroHeightFraction).toBeLessThanOrEqual(0.48)
      }
      const presentation = profile.presentation
      expect(presentation).toBeDefined()
      expect(['protected-cover', 'contain']).toContain(presentation!.short.fit)
      expect(presentation!.short.stageHeight).toBeGreaterThan(0)
      expect(presentation!.short.stageHeight).toBeLessThanOrEqual(520)
      expect(['warm', 'cool', 'vivid', 'pattern', 'architectural', 'amber'])
        .toContain(presentation!.long.frameEffect)
      expect(['protected-cover', 'contain']).toContain(presentation!.long.cameoFit)

      expect(asset.hukamnamaUse).toMatchObject({
        catalogStatus: 'included-existing',
        shortTreatment: 'contained-hero',
        longTreatment: 'ambient-mat',
      })
    }
  })

  it('records the exact fail-closed rights, source, and cultural review matrix', () => {
    const actualReviewMatrix = Object.fromEntries(
      shareHighlightHukamnamaAssets.map(asset => [
        asset.id,
        [
          asset.hukamnamaUse.rightsReview.status,
          asset.hukamnamaUse.rightsReview.sourceStatus,
          asset.hukamnamaUse.culturalReview.status,
        ],
      ])
    )

    expect(actualReviewMatrix).toEqual(expectedReviewMatrix)
    expect(shareHighlightHukamnamaAssets.filter(asset => (
      asset.hukamnamaUse.rightsReview.status === 'blocked'
    )).map(asset => asset.id)).toEqual([
      'string-and-tabla',
      'waterside-temple',
    ])
    expect(shareHighlightHukamnamaAssets.filter(asset => (
      asset.hukamnamaUse.culturalReview.status === 'blocked'
    )).map(asset => asset.id)).toEqual(['waterside-temple'])
  })

  it('keeps the release gate closed with no artwork marked cleared', () => {
    const reviewStatuses: string[] = shareHighlightHukamnamaAssets.flatMap(
      asset => [
        asset.hukamnamaUse.rightsReview.status,
        asset.hukamnamaUse.culturalReview.status,
      ]
    )

    expect(reviewStatuses).not.toContain('cleared')
    expect(reviewStatuses.every(status => (
      status === 'blocked' || status === 'unresolved'
    ))).toBe(true)
  })

  it('links authoritative records only for identified underlying works', () => {
    const identifiedAssets = shareHighlightHukamnamaAssets.filter(asset => (
      asset.hukamnamaUse.rightsReview.sourceStatus
        === 'work-identified-file-unverified'
    ))

    expect(identifiedAssets.map(asset => asset.id)).toEqual([
      'fort-procession',
      'devotional-interior',
      'waterside-temple',
      'falconer-on-horseback',
    ])
    for (const asset of identifiedAssets) {
      expect(asset.hukamnamaUse.rightsReview.creator).toBeTruthy()
      expect(asset.hukamnamaUse.rightsReview.title).toBeTruthy()
      expect(asset.hukamnamaUse.rightsReview.sourceUrl).toMatch(/^https:\/\//)
      expect(asset.hukamnamaUse.rightsReview.note).toContain('local')
    }

    for (const asset of shareHighlightHukamnamaAssets.filter(asset => (
      asset.hukamnamaUse.rightsReview.sourceStatus === 'unknown'
    ))) {
      expect(asset.hukamnamaUse.rightsReview.sourceUrl).toBeUndefined()
    }
  })

  it('keeps the intentional per-asset short and long art direction', () => {
    for (const asset of shareHighlightHukamnamaAssets) {
      const presentation = asset.storyProfile.presentation!
      expect([
        presentation.short.fit,
        presentation.short.stageHeight,
        presentation.long.frameEffect,
        presentation.long.cameoFit,
      ], asset.id).toEqual(expectedStoryPresentations[asset.id])
    }

    expect(
      shareHighlightHukamnamaAssets.find(asset => (
        asset.id === 'ceremonial-arms-display'
      ))?.storyProfile.presentation?.long.cameoMaxAspect
    ).toBe(1.05)
    expect(shareHighlightHukamnamaAssets.filter(asset => (
      asset.storyProfile.presentation?.short.fit === 'contain'
    )).map(asset => asset.id)).toEqual([
      'waterside-temple',
      'miniature-collage',
      'golden-court-assembly',
    ])
  })

  it('fails closed for unknown IDs or missing catalog inclusion metadata', () => {
    const allowed = shareHighlightHukamnamaAssets[0]!
    const futureAsset: ShareHighlightAsset = {
      ...allowed,
      id: 'future-artwork',
    }
    const missingCatalogStatus: ShareHighlightAsset = {
      ...allowed,
      hukamnamaUse: undefined,
    }
    const historicalStatusOnly: ShareHighlightAsset = {
      ...allowed,
      hukamnamaUse: {
        status: 'approved-neutral',
        provenance: 'Historical metadata only.',
        createdDate: '2026-08-11',
      },
    }
    const quietParchment = shareHighlightAssets.find(
      asset => asset.id === 'quiet-parchment'
    )!

    expect(isShareHighlightHukamnamaAsset(allowed)).toBe(true)
    expect(isShareHighlightHukamnamaAsset(futureAsset)).toBe(false)
    expect(isShareHighlightHukamnamaAsset(missingCatalogStatus)).toBe(false)
    expect(isShareHighlightHukamnamaAsset(historicalStatusOnly)).toBe(false)
    expect(isShareHighlightHukamnamaAsset(quietParchment)).toBe(false)
  })
})
