import { expect, test, vi } from 'vitest'
import { getBaniDownloadItems } from './baniDownloadItems'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { SHABADOS_BANIS } from '../data/shabadosBanis'

test('the download manager opens all 108 exact readings with unique provider identities', () => {
  const open = vi.fn()
  const items = getBaniDownloadItems(open)
  expect(items).toHaveLength(108)
  expect(new Set(items.map(item => item.key)).size).toBe(108)
  for (const item of items) {
    expect(item.createSource().key).toBe(item.key)
    item.onOpen?.()
  }
  expect(open).toHaveBeenCalledTimes(108)
  expect(open.mock.calls.every(([path]) => path.startsWith('/study?'))).toBe(true)
  for (const bani of SHABADOS_BANIS) {
    const index = items.findIndex(item => item.key === `shabados:${bani.id}`)
    const params = new URL(open.mock.calls[index][0], 'https://naamras.test').searchParams
    expect(params.get('shabadosBani')).toBe(bani.id)
    expect(params.has('sgLength')).toBe(false)
  }
})

test('opening a downloaded routine reads its current saved default length', () => {
  const previous = useSundarGutkaLengthStore.getState().lengths
  const open = vi.fn()
  const item = getBaniDownloadItems(open).find(item => item.key === 'banidb:21')!
  try {
    useSundarGutkaLengthStore.setState({ lengths: { ...previous, 'rehras-sahib': 'extralong' } })
    item.onOpen?.()
    expect(new URL(open.mock.calls[0][0], 'https://naamras.test').searchParams.get('sgLength')).toBe('extralong')
  } finally { useSundarGutkaLengthStore.setState({ lengths: previous }) }
})
