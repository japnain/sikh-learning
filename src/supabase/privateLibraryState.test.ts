import { createClient } from '@supabase/supabase-js'
import { describe, expect, test, vi } from 'vitest'
import { PrivateStateWriteError, validStateTimestamp, writeOrderedPrivateState } from '../../supabase/functions/private-library/state'

const timestamp = '2026-11-17T12:00:00.002Z'
const scope = ['owner', 'book', 'edition'] as const
function clientWithResponse(data: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }))
  const client = createClient('https://test.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  })
  return { client, fetch }
}

describe('private state RPC adapter', () => {
  test('accepts only canonical millisecond UTC revisions before sending state', async () => {
    const { client, fetch } = clientWithResponse({})
    expect(validStateTimestamp(timestamp)).toBe(true)
    for (const updatedAt of [undefined, null, 123, '', 'tomorrow', '2026-02-30T00:00:00.000Z',
      '2026-11-17T12:00:00Z', '2026-11-17T12:00:00.002+00:00', `${timestamp},user_id.not.is.null`]) {
      expect(validStateTimestamp(updatedAt)).toBe(false)
      await expect(writeOrderedPrivateState(client, ...scope, { updatedAt })).rejects.toThrow('Invalid reading revision')
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  test('sends one atomic RPC with verified scope and returns merged authoritative notes', async () => {
    const merged = { index: 8, updatedAt: timestamp, annotations: [{ id: 'remote-note' }] }
    const { client, fetch } = clientWithResponse(merged)
    const local = { index: 2, updatedAt: timestamp, annotationDeletes: [{ id: 'removed-note', updatedAt: timestamp }] }
    expect(await writeOrderedPrivateState(client, ...scope, local)).toEqual(merged)
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/rest/v1/rpc/write_private_library_state')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ requested_user_id: 'owner', requested_book_id: 'book', requested_edition_version: 'edition', requested_state: local })
  })

  test('classifies recoverable capacity and edition conflicts without leaking diagnostics', async () => {
    for (const [message, code] of [['private-library-state-capacity', 'capacity'], ['private-library-edition-changed', 'edition-changed'], ['private-library-invalid-state', 'invalid-state']] as const) {
      const { client } = clientWithResponse({ code: 'P0001', message, details: 'private internal detail' }, 400)
      const failure = await writeOrderedPrivateState(client, ...scope, { updatedAt: timestamp }).catch(error => error)
      expect(failure).toBeInstanceOf(PrivateStateWriteError)
      expect(failure.code).toBe(code)
      expect(failure.message).not.toContain('internal')
    }
  })

  test('unexpected database failure never reports a successful save', async () => {
    const { client } = clientWithResponse({ message: 'internal failure' }, 500)
    await expect(writeOrderedPrivateState(client, ...scope, { updatedAt: timestamp })).rejects.toThrow('Reading state unavailable')
  })

  test('rejects malformed RPC results', async () => {
    for (const payload of [null, [], 'state']) {
      const { client } = clientWithResponse(payload)
      await expect(writeOrderedPrivateState(client, ...scope, { updatedAt: timestamp })).rejects.toThrow('Reading state unavailable')
    }
  })
})
