import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'
import Privacy from './Privacy'
import { useLocaleStore } from '../store/locale'
import { useCloudSyncStore } from '../store/cloudSync'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useCloudSyncStore.setState({ configured: false })
})

test('discloses both word providers and the user-controlled support report', () => {
  render(<MemoryRouter><Privacy /></MemoryRouter>)
  expect(screen.getByText(/Opening a word sends/)).toHaveTextContent('backend.searchgurbani.com')
  expect(screen.getByText(/Opening a word sends/)).toHaveTextContent('requesting IP address')
  expect(screen.getByText(/Up to 20 recent technical failures/)).toHaveTextContent('Reloading clears this history')
  expect(screen.getByText(/BaniDB-backed services provide scripture/)).toHaveTextContent('posting a report publicly exposes its contents')
})


test('describes the enabled capabilities without inviting disabled sign-in', () => {
  render(<MemoryRouter><Privacy /></MemoryRouter>)
  expect(screen.getByText(/Cloud backup and sign-in are unavailable/)).toBeInTheDocument()
  expect(screen.getByText(/does not send your personal saved data/)).toBeInTheDocument()
  expect(screen.queryByText(/should only be connected/)).not.toBeInTheDocument()
})

test.each(['pa', 'hi'] as const)('provides a localized English-policy notice and help navigation in %s', locale => {
  useLocaleStore.setState({ locale })
  render(<MemoryRouter><Privacy /></MemoryRouter>)
  expect(screen.getByTestId('page-privacy')).toHaveAttribute('lang', locale)
  expect(screen.getByTestId('privacy-language-notice')).toHaveTextContent(locale === 'pa' ? 'ਸਿਰਫ਼ ਅੰਗਰੇਜ਼ੀ' : 'केवल अंग्रेज़ी')
  expect(screen.getByRole('heading', { name: 'What the app stores' }).closest('section')).toHaveAttribute('lang', 'en')
  expect(screen.getByRole('link', { name: locale === 'pa' ? 'ਸਹਾਇਤਾ ਖੋਲ੍ਹੋ' : 'सहायता खोलें' })).toHaveAttribute('href', '/support')
})


test('discloses provider discovery before sign-in and proxied or direct scripture requests', () => {
  useCloudSyncStore.setState({ configured: true })
  render(<MemoryRouter><Privacy /></MemoryRouter>)
  expect(screen.getByText(/NaamRas checks Supabase for available sign-in methods/)).toHaveTextContent('IP address')
  expect(screen.getByText(/NaamRas checks Supabase for available sign-in methods/)).toHaveTextContent('reading activity')
  expect(screen.getByText(/Scripture and translation requests are sent/)).toHaveTextContent('NaamRas retries with BaniDB directly')
})
