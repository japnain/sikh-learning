import { describe, expect, test, vi } from 'vitest'
import {
  DELETE_ACCOUNT_MAX_REQUEST_BYTES,
  createDeleteAccountHandler,
  type DeleteAccountHandlerOptions,
} from '../../supabase/functions/delete-account/handler'
import {
  MERGE_LOCAL_STATE_MAX_REQUEST_BYTES,
  createMergeLocalStateHandler,
  type MergeLocalStateHandlerOptions,
} from '../../supabase/functions/merge-local-state/handler'
import { isAllowedNaamrasOrigin } from '../../supabase/functions/_shared/secure-http'

const FUNCTION_URL = 'https://naamras-functions.example/function'
const VALID_TOKEN = 'header.payload.signature'
const UPDATED_AT = '2026-07-29T12:00:00.000Z'

function validSnapshot() {
  return {
    version: 3,
    deviceId: 'device-a',
    profile: {
      id: 'profile',
      userId: null,
      deviceId: 'device-a',
      clientUpdatedAt: UPDATED_AT,
      baseUpdatedAt: null,
      deletedAt: null,
      locale: 'en',
      reader: {},
      onboarding: {},
    },
    savedItems: [],
    vocabEntries: [],
    learningProgress: [],
    activityEvents: [],
  }
}

function functionRequest({
  body = {},
  contentType = 'application/json',
  method = 'POST',
  origin = 'https://naamras.xyz',
  token = VALID_TOKEN,
}: {
  body?: unknown
  contentType?: string | null
  method?: string
  origin?: string | null
  token?: string | null
} = {}) {
  const headers = new Headers()
  if (contentType !== null) headers.set('content-type', contentType)
  if (origin !== null) headers.set('origin', origin)
  if (token !== null) headers.set('authorization', `Bearer ${token}`)
  return new Request(FUNCTION_URL, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
}

function env(name: string) {
  return {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  }[name]
}

function mergeOptions(
  overrides: Partial<MergeLocalStateHandlerOptions> = {},
): MergeLocalStateHandlerOptions {
  return {
    readEnv: env,
    createService: () => ({
      authenticate: async () => 'user-private-id',
      mergeSnapshot: async (incomingRecords, incomingEvents) => ({
        failed: false,
        data: {
          version: 3,
          complete: true,
          acknowledgedEventIds: incomingEvents.map((event) => String(event.id)),
          mergedAt: UPDATED_AT,
          records: incomingRecords.map((record) => ({
            ...record.record,
            recordType: record.record_type,
          })),
        },
      }),
    }),
    ...overrides,
  }
}

function deleteOptions(
  overrides: Partial<DeleteAccountHandlerOptions> = {},
): DeleteAccountHandlerOptions {
  return {
    readEnv: env,
    createService: () => ({
      authenticate: async () => 'user-private-id',
      deleteUser: async () => true,
    }),
    ...overrides,
  }
}

describe('NaamRas cloud Edge HTTP boundary', () => {
  test('allows only exact production, local-development, and native origins', async () => {
    for (const origin of [
      'https://naamras.xyz',
      'https://www.naamras.xyz',
      'http://localhost:5173',
      'https://127.0.0.1:4173',
      'http://[::1]:5173',
      'capacitor://localhost',
      'ionic://localhost',
    ]) {
      expect(isAllowedNaamrasOrigin(origin), origin).toBe(true)
    }
    for (const origin of [
      'https://attacker.example',
      'https://naamras.xyz.attacker.example',
      'http://localhost.attacker.example',
      'capacitor://attacker.example',
      'null',
    ]) {
      expect(isAllowedNaamrasOrigin(origin), origin).toBe(false)
    }

    const handlers = [
      createMergeLocalStateHandler(mergeOptions()),
      createDeleteAccountHandler(deleteOptions()),
    ]
    for (const handler of handlers) {
      const rejected = await handler(functionRequest({
        origin: 'https://attacker.example',
      }))
      expect(rejected.status).toBe(403)
      expect(rejected.headers.has('access-control-allow-origin')).toBe(false)
      expect(rejected.headers.get('vary')).toBe('Origin')

      const preflight = await handler(functionRequest({
        method: 'OPTIONS',
        origin: 'capacitor://localhost',
        token: null,
      }))
      expect(preflight.status).toBe(204)
      expect(preflight.headers.get('access-control-allow-origin'))
        .toBe('capacitor://localhost')
      expect(preflight.headers.get('access-control-allow-methods'))
        .toBe('POST, OPTIONS')
    }
  })

  test('rejects unsupported methods, media types, and malformed auth safely', async () => {
    const createMergeService = vi.fn(mergeOptions().createService)
    const createDeleteService = vi.fn(deleteOptions().createService)
    const handlers = [
      {
        createService: createMergeService,
        handler: createMergeLocalStateHandler(mergeOptions({
          createService: createMergeService,
        })),
      },
      {
        createService: createDeleteService,
        handler: createDeleteAccountHandler(deleteOptions({
          createService: createDeleteService,
        })),
      },
    ]

    for (const { createService, handler } of handlers) {
      const invalidMethod = await handler(functionRequest({ method: 'GET' }))
      expect(invalidMethod.status).toBe(405)
      expect(invalidMethod.headers.get('allow')).toBe('POST, OPTIONS')

      const missingMedia = await handler(functionRequest({
        contentType: null,
      }))
      expect(missingMedia.status).toBe(415)

      const misleadingMedia = await handler(functionRequest({
        contentType: 'text/plain; profile=application/json',
      }))
      expect(misleadingMedia.status).toBe(415)

      const missingAuth = await handler(functionRequest({ token: null }))
      expect(missingAuth.status).toBe(401)

      const malformedAuth = new Request(FUNCTION_URL, {
        method: 'POST',
        headers: {
          authorization: 'Bearer token with spaces',
          'content-type': 'application/json',
          origin: 'https://naamras.xyz',
        },
        body: '{}',
      })
      expect((await handler(malformedAuth)).status).toBe(401)
      expect(createService).not.toHaveBeenCalled()
    }
  })

  test('accepts JSON charset parameters and does not expose user IDs on success', async () => {
    const handler = createMergeLocalStateHandler(mergeOptions())
    const response = await handler(functionRequest({
      body: { reason: 'manual', snapshot: validSnapshot() },
      contentType: 'Application/JSON; Charset=UTF-8',
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('access-control-allow-origin'))
      .toBe('https://naamras.xyz')
    const result = await response.json()
    expect(result).not.toHaveProperty('userId')
    expect(result).toMatchObject({
      version: 3,
      complete: true,
      mergedAt: UPDATED_AT,
      acknowledgedEventIds: [],
      snapshot: {
        version: 3,
        generatedAt: UPDATED_AT,
      },
    })
  })

  test('bounds streamed request bodies even without Content-Length', async () => {
    const mergeSnapshot = vi.fn()
    const mergeHandler = createMergeLocalStateHandler(mergeOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        mergeSnapshot,
      }),
    }))
    const deleteUser = vi.fn()
    const deleteHandler = createDeleteAccountHandler(deleteOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        deleteUser,
      }),
    }))

    const oversizedMerge = functionRequest({
      body: { padding: 'x'.repeat(MERGE_LOCAL_STATE_MAX_REQUEST_BYTES) },
    })
    const oversizedDelete = functionRequest({
      body: { padding: 'x'.repeat(DELETE_ACCOUNT_MAX_REQUEST_BYTES) },
    })
    expect(oversizedMerge.headers.has('content-length')).toBe(false)
    expect(oversizedDelete.headers.has('content-length')).toBe(false)

    expect((await mergeHandler(oversizedMerge)).status).toBe(413)
    expect((await deleteHandler(oversizedDelete)).status).toBe(413)
    expect(mergeSnapshot).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })
})

describe('merge-local-state Edge handler', () => {
  test('rejects v2 snapshots before invoking the merge RPC', async () => {
    const mergeSnapshot = vi.fn()
    const handler = createMergeLocalStateHandler(mergeOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        mergeSnapshot,
      }),
    }))

    const response = await handler(functionRequest({
      body: {
        snapshot: { ...validSnapshot(), version: 2 },
      },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'snapshot.version must be 3.',
      code: 'invalid-cloud-snapshot',
    })
    expect(mergeSnapshot).not.toHaveBeenCalled()
  })

  test('redacts database diagnostics and identifiers from failures', async () => {
    const handler = createMergeLocalStateHandler(mergeOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        mergeSnapshot: async () => ({
          data: {
            detail: 'relation public.private_table does not exist',
            hint: 'user-private-id',
          },
          failed: true,
        }),
      }),
    }))

    const response = await handler(functionRequest({
      body: { snapshot: validSnapshot() },
    }))
    expect(response.status).toBe(502)
    const serialized = JSON.stringify(await response.json())
    expect(serialized).toBe(JSON.stringify({
      error: 'Cloud sync database merge failed.',
      code: 'database-merge-failed',
    }))
    expect(serialized).not.toContain('detail')
    expect(serialized).not.toContain('hint')
    expect(serialized).not.toContain('user-private-id')
  })

  test('returns controlled authentication and remote-snapshot failures', async () => {
    const authFailure = createMergeLocalStateHandler(mergeOptions({
      createService: () => ({
        authenticate: async () => {
          throw new Error('JWT user user-private-id failed')
        },
        mergeSnapshot: async () => {
          throw new Error('should not run')
        },
      }),
    }))
    const authResponse = await authFailure(functionRequest({
      body: { snapshot: validSnapshot() },
    }))
    expect(authResponse.status).toBe(502)
    expect(JSON.stringify(await authResponse.json()))
      .not.toContain('user-private-id')

    const invalidRemote = createMergeLocalStateHandler(mergeOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        mergeSnapshot: async () => ({
          failed: false,
          data: {
            version: 3,
            complete: true,
            acknowledgedEventIds: [],
            mergedAt: UPDATED_AT,
            records: [{ secret: 'database-detail-user-private-id' }],
          },
        }),
      }),
    }))
    const invalidResponse = await invalidRemote(functionRequest({
      body: { snapshot: validSnapshot() },
    }))
    expect(invalidResponse.status).toBe(502)
    expect(await invalidResponse.json()).toEqual({
      error: 'Cloud sync database returned an invalid remote snapshot.',
      code: 'invalid-remote-snapshot',
    })
  })
})

describe('delete-account Edge handler', () => {
  test('authenticates before confirmation and deletes only the session user', async () => {
    const deleteUser = vi.fn(async () => true)
    const handler = createDeleteAccountHandler(deleteOptions({
      createService: () => ({
        authenticate: async () => 'authenticated-user-id',
        deleteUser,
      }),
    }))

    const missingConfirmation = await handler(functionRequest({ body: {} }))
    expect(missingConfirmation.status).toBe(400)
    expect(deleteUser).not.toHaveBeenCalled()

    const deleted = await handler(functionRequest({
      body: {
        confirmation: 'delete',
        userId: 'attacker-selected-user-id',
      },
    }))
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ deleted: true })
    expect(deleteUser).toHaveBeenCalledOnce()
    expect(deleteUser).toHaveBeenCalledWith('authenticated-user-id')
  })

  test('redacts admin deletion errors', async () => {
    const handler = createDeleteAccountHandler(deleteOptions({
      createService: () => ({
        authenticate: async () => 'user-private-id',
        deleteUser: async () => {
          throw new Error(
            'auth.users foreign key detail for user-private-id',
          )
        },
      }),
    }))

    const response = await handler(functionRequest({
      body: { confirmation: 'delete' },
    }))
    expect(response.status).toBe(502)
    const serialized = JSON.stringify(await response.json())
    expect(serialized).toBe(JSON.stringify({
      error: 'Account deletion could not be completed.',
    }))
    expect(serialized).not.toContain('user-private-id')
    expect(serialized).not.toContain('auth.users')
  })
})
