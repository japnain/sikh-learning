#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import process from 'node:process'

const PASSWORD = 'NaamRas123!'
const FUNCTION_SLUG = 'merge-local-state'

function runCliJson(args) {
  const stdout = execFileSync('npx', ['@insforge/cli', '--json', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return JSON.parse(stdout)
}

function sqlEscape(value) {
  return value.replace(/'/g, "''")
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON but received: ${text.slice(0, 400)}`)
  }
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init)
  const data = await readJson(response)

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? `${response.status} ${response.statusText}`
    throw new Error(`${url} failed: ${message}`)
  }

  return data
}

function buildSnapshot(nowIso, dayStamp) {
  return {
    version: 1,
    deviceId: 'device-codex-smoke',
    profile: {
      id: `profile-${crypto.randomUUID()}`,
      deviceId: 'device-codex-smoke',
      clientUpdatedAt: nowIso,
      deletedAt: null,
      locale: 'en',
      darkMode: false,
      reader: {
        scriptMode: 'gurmukhi',
        showTransliteration: false,
        meaningLanguage: 'en',
        larivaar: false,
        showVishraam: true,
        lineSpacing: 'relaxed',
        textAlign: 'left',
        fontSize: 22,
        englishSource: 'bdb',
        sundarGutkaLengths: {},
      },
      onboarding: {
        hasCompletedOnboarding: true,
        learningLevel: 'beginner',
        audience: 'adult',
        learningGoal: 'understand',
        presentationMode: 'overlay',
      },
    },
    savedItems: [
      {
        id: `saved-${crypto.randomUUID()}`,
        deviceId: 'device-codex-smoke',
        clientUpdatedAt: nowIso,
        deletedAt: null,
        kind: 'bookmark',
        naturalKey: 'bookmark:G:1:shabad:ang',
        payload: {
          id: `bookmark-${crypto.randomUUID()}`,
          type: 'shabad',
          title: 'SGGS · Ang 1',
          source: 'G',
          ang: 1,
          savedAt: nowIso,
        },
      },
    ],
    vocabEntries: [
      {
        id: `vocab-${crypto.randomUUID()}`,
        deviceId: 'device-codex-smoke',
        clientUpdatedAt: nowIso,
        deletedAt: null,
        naturalKey: 'word:ੴ',
        payload: {
          kind: 'word',
          word: 'ੴ',
          transliteration: 'Ik Oankar',
          meaning_en: 'One Creator',
          meaning_hi: 'एक ओंकार',
          meaning_pa: 'ਇੱਕ ਅਕਾਲ',
          scripture: 'SGGS',
          sourceId: 'G',
          savedAt: nowIso,
          context: {
            scripture: 'SGGS',
            sourceId: 'G',
            ang: 1,
          },
          review: {
            dueAt: nowIso,
            intervalDays: 0,
            reviewCount: 0,
          },
        },
      },
    ],
    learningProgress: [
      {
        id: `progress-${crypto.randomUUID()}`,
        deviceId: 'device-codex-smoke',
        clientUpdatedAt: nowIso,
        deletedAt: null,
        scope: 'study-progress',
        payload: {
          streak: 1,
          lastStudied: dayStamp,
        },
      },
    ],
    activityEvents: [
      {
        id: `event-${crypto.randomUUID()}`,
        deviceId: 'device-codex-smoke',
        eventType: 'study.ang.viewed',
        occurredAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: null,
        payload: {
          source: 'G',
          ang: 1,
          studiedOn: dayStamp,
        },
      },
    ],
  }
}

async function main() {
  const context = runCliJson(['current'])
  const baseUrl = context.project?.oss_host
  const appKey = context.project?.appkey
  const apiKey = context.project?.api_key ?? runCliJson(['secrets', 'get', 'API_KEY']).value

  if (!baseUrl || !appKey || !apiKey) {
    throw new Error('InsForge project context is incomplete. Run `npx @insforge/cli current` first.')
  }

  const functionsBaseUrl = `https://${appKey}.functions.insforge.app`
  const publicConfig = await requestJson(`${baseUrl}/api/auth/public-config`)
  const providers = publicConfig.oAuthProviders ?? []

  for (const provider of ['apple', 'google']) {
    if (!providers.includes(provider)) {
      throw new Error(`Public auth config is missing ${provider}. Found: ${providers.join(', ')}`)
    }
  }

  console.log(`Public auth config OK: ${providers.join(', ')}`)

  const email = `naamras-smoke-${Date.now()}@example.com`
  let userId = null

  try {
    await requestJson(`${baseUrl}/api/auth/users`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        name: 'NaamRas Smoke Test',
      }),
    })

    const verifyResult = runCliJson([
      'db',
      'query',
      `update auth.users set email_verified = true where email = '${sqlEscape(email)}' returning id, email, email_verified`,
    ])

    userId = verifyResult.rows?.[0]?.id ?? null
    if (!userId) {
      throw new Error('Could not verify or locate the smoke-test user.')
    }

    const session = await requestJson(`${baseUrl}/api/auth/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: PASSWORD,
      }),
    })

    if (!session.accessToken) {
      throw new Error('Smoke-test user sign-in did not return an access token.')
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const dayStamp = nowIso.slice(0, 10)
    const snapshot = buildSnapshot(nowIso, dayStamp)

    const merge = await requestJson(`${functionsBaseUrl}/${FUNCTION_SLUG}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'insforge-smoke-test',
        snapshot,
      }),
    })

    const summary = {
      profile: merge.snapshot?.profile ? 1 : 0,
      savedItems: merge.snapshot?.savedItems?.length ?? 0,
      vocabEntries: merge.snapshot?.vocabEntries?.length ?? 0,
      learningProgress: merge.snapshot?.learningProgress?.length ?? 0,
      activityEvents: merge.snapshot?.activityEvents?.length ?? 0,
    }

    if (summary.profile !== 1 || summary.savedItems !== 1 || summary.vocabEntries !== 1 || summary.learningProgress !== 1 || summary.activityEvents < 1) {
      throw new Error(`Unexpected merge snapshot summary: ${JSON.stringify(summary)}`)
    }

    const verification = runCliJson([
      'db',
      'query',
      `select
        (select count(*) from public.user_profiles where user_id = '${userId}') as user_profiles,
        (select count(*) from public.saved_items where user_id = '${userId}' and deleted_at is null) as saved_items,
        (select count(*) from public.vocab_entries where user_id = '${userId}' and deleted_at is null) as vocab_entries,
        (select count(*) from public.learning_progress where user_id = '${userId}' and deleted_at is null) as learning_progress,
        (select count(*) from public.activity_events where user_id = '${userId}') as activity_events`,
    ])

    const counts = verification.rows?.[0] ?? {}
    const expectedCounts = {
      user_profiles: 1,
      saved_items: 1,
      vocab_entries: 1,
      learning_progress: 1,
      activity_events: 1,
    }

    for (const [key, expected] of Object.entries(expectedCounts)) {
      if (Number(counts[key]) !== expected) {
        throw new Error(`Unexpected persisted ${key} count: expected ${expected}, received ${counts[key]}`)
      }
    }

    console.log('Merge function OK: persisted rows verified.')
  } finally {
    if (userId) {
      runCliJson([
        'db',
        'query',
        `delete from public.activity_events where user_id = '${userId}';
         delete from public.learning_progress where user_id = '${userId}';
         delete from public.vocab_entries where user_id = '${userId}';
         delete from public.saved_items where user_id = '${userId}';
         delete from public.user_profiles where user_id = '${userId}';`,
      ])

      await requestJson(`${baseUrl}/api/auth/users`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [userId],
        }),
      })
    }
  }

  console.log('InsForge smoke test passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
