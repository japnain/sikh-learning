import { createClient } from '@supabase/supabase-js'
import { describe, expect, test, vi } from 'vitest'
import { validStateTimestamp, writeOrderedPrivateState } from '../../supabase/functions/private-library/state'

type Row = { user_id: string; book_id: string; edition_version: string; state: Record<string, unknown> }
const older = '2026-11-17T12:00:00.001Z'
const newer = '2026-11-17T12:00:00.002Z'
const scope = ['owner', 'book', 'edition'] as const
const key = (row: Row) => `${row.user_id}:${row.book_id}:${row.edition_version}`
const seed = (state: Record<string, unknown>, owner = 'owner'): Row => ({ user_id: owner, book_id: 'book', edition_version: 'edition', state })

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

function database(initial: Row[] = [], before?: (method: string, row: Row) => Promise<void>) {
  const rows = new Map(initial.map(row => [key(row), structuredClone(row)]))
  // Exercise the real SDK's HTTP serialization, including conflict resolution,
  // identity predicates and JSON-field comparison; the map models DB row writes.
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const row = await request.json() as Row
    await before?.(request.method, row)
    if (request.method === 'POST') {
      expect(url.searchParams.get('on_conflict')).toBe('user_id,book_id,edition_version')
      expect(request.headers.get('prefer')).toContain('resolution=ignore-duplicates')
      if (!rows.has(key(row))) rows.set(key(row), structuredClone(row))
    } else if (request.method === 'PATCH') {
      expect(url.searchParams.get('user_id')).toBe(`eq.${row.user_id}`)
      expect(url.searchParams.get('book_id')).toBe(`eq.${row.book_id}`)
      expect(url.searchParams.get('edition_version')).toBe(`eq.${row.edition_version}`)
      expect(url.searchParams.get('or')).toBe(`(state->>updatedAt.is.null,state->>updatedAt.lt.${row.state.updatedAt})`)
      const existing = rows.get(key(row))
      if (existing && (existing.state.updatedAt == null || String(existing.state.updatedAt) < String(row.state.updatedAt))) {
        rows.set(key(row), structuredClone(row))
      }
    } else throw new Error('Unexpected operation')
    return new Response(null, { status: 204 })
  })
  const client = createClient('https://test.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  })
  return { rows, client, fetch }
}

describe('ordered private state persistence', () => {
  test('accepts only canonical millisecond UTC revisions before interpolating a filter', async () => {
    const db = database()
    expect(validStateTimestamp(newer)).toBe(true)
    for (const updatedAt of [undefined, null, 123, '', 'tomorrow', '2026-02-30T00:00:00.000Z',
      '2026-11-17T12:00:00Z', '2026-11-17T12:00:00.002+00:00', `${newer},user_id.not.is.null`]) {
      expect(validStateTimestamp(updatedAt)).toBe(false)
      await expect(writeOrderedPrivateState(db.client, ...scope, { updatedAt })).rejects.toThrow('Invalid reading revision')
    }
    expect(db.fetch).not.toHaveBeenCalled()
  })

  test('a slow older update cannot overwrite a completed departure save', async () => {
    const held = deferred(), entered = deferred()
    const db = database([seed({ index: 1, updatedAt: '2026-11-17T12:00:00.000Z' })], async (method, row) => {
      if (method === 'PATCH' && row.state.updatedAt === older) { entered.resolve(); await held.promise }
    })
    const stale = writeOrderedPrivateState(db.client, ...scope, { index: 2, updatedAt: older })
    await entered.promise
    await writeOrderedPrivateState(db.client, ...scope, { index: 3, updatedAt: newer })
    held.resolve(); await stale
    expect(db.rows.get('owner:book:edition')?.state).toEqual({ index: 3, updatedAt: newer })
  })

  test('a delayed first insert cannot replace a newer first-ever save', async () => {
    const held = deferred(), entered = deferred()
    const db = database([], async (method, row) => {
      if (method === 'POST' && row.state.updatedAt === older) { entered.resolve(); await held.promise }
    })
    const stale = writeOrderedPrivateState(db.client, ...scope, { index: 2, updatedAt: older })
    await entered.promise
    await writeOrderedPrivateState(db.client, ...scope, { index: 3, updatedAt: newer })
    held.resolve(); await stale
    expect(db.rows.get('owner:book:edition')?.state).toEqual({ index: 3, updatedAt: newer })
  })

  test('equal revisions are idempotent and legacy state upgrades without crossing owners', async () => {
    const db = database([seed({ index: 1 }), seed({ index: 9, updatedAt: newer }, 'another-owner')])
    await writeOrderedPrivateState(db.client, ...scope, { index: 2, updatedAt: newer })
    await writeOrderedPrivateState(db.client, ...scope, { index: 99, updatedAt: newer })
    expect(db.rows.get('owner:book:edition')?.state).toEqual({ index: 2, updatedAt: newer })
    expect(db.rows.get('another-owner:book:edition')?.state).toEqual({ index: 9, updatedAt: newer })
  })

  test('database failure never reports a successful save', async () => {
    const db = database()
    db.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'internal failure' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    }))
    await expect(writeOrderedPrivateState(db.client, ...scope, { index: 2, updatedAt: newer })).rejects.toThrow('Reading state unavailable')
    expect(db.fetch).toHaveBeenCalledOnce()
  })
})
