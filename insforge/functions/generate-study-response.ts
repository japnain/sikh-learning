import { createClient } from 'npm:@insforge/sdk'

declare const Deno:
  | {
      env?: {
        get: (name: string) => string | undefined
      }
    }
  | undefined

type StudyMode = 'explain-pankti' | 'reflect-hukamnama' | 'study-saved-word'

type GenerateStudyRequest = {
  mode: StudyMode
  scripture: {
    title: string
    gurmukhi?: string
    transliteration?: string
    translation?: string
  }
  context?: Record<string, unknown>
}

type GenerateStudyResponse = {
  mode: StudyMode
  title: string
  body: string
  bulletPoints: string[]
  reflectionPrompt: string | null
  guardrail: string
}

type AIResponseShape = {
  title?: string
  body?: string
  bulletPoints?: string[]
  reflectionPrompt?: string | null
}

const STUDY_GUARDRAIL =
  'This is explanatory, non-canonical commentary grounded only in the scripture and context already shown in NaamRas.'

const MODE_LABELS: Record<StudyMode, string> = {
  'explain-pankti': 'Explain this pankti',
  'reflect-hukamnama': "Reflect on today's hukamnama",
  'study-saved-word': 'Study this saved word in context',
}

function readEnv(name: string) {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name) ?? undefined
  }

  if (typeof process !== 'undefined') {
    return process.env[name]
  }

  return undefined
}

function normalizeOptionalString(value: string | undefined | null) {
  const next = value?.trim()
  return next ? next : undefined
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!header) return null

  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function resolveInsForgeBaseUrl(request: Request) {
  return (
    normalizeOptionalString(readEnv('INSFORGE_BASE_URL'))
    ?? normalizeOptionalString(readEnv('INSFORGE_URL'))
    ?? normalizeOptionalString(readEnv('VITE_INSFORGE_URL'))
    ?? new URL(request.url).origin
  )
}

async function requireAuthenticatedClient(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return {
      client: null,
      user: null,
      error: jsonResponse({ error: 'Missing bearer token.' }, 401),
    }
  }

  const client = createClient({
    baseUrl: resolveInsForgeBaseUrl(request),
    edgeFunctionToken: token,
    isServerMode: true,
  })

  const { data, error } = await client.auth.getCurrentUser()
  const user = data?.user ?? null

  if (error || !user) {
    return {
      client: null,
      user: null,
      error: jsonResponse({ error: error?.message ?? 'Unable to authenticate user.' }, 401),
    }
  }

  return { client, user, error: null }
}

function readFunctionSetting(name: string, fallback?: string) {
  return normalizeOptionalString(readEnv(name)) ?? fallback
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isGenerateStudyRequest(value: unknown): value is GenerateStudyRequest {
  if (!isRecord(value)) return false
  if (!['explain-pankti', 'reflect-hukamnama', 'study-saved-word'].includes(String(value.mode ?? ''))) {
    return false
  }
  if (!isRecord(value.scripture)) return false

  return typeof value.scripture.title === 'string' && value.scripture.title.trim().length > 0
}

function sanitizeOptionalString(value: unknown, maxLength = 2400) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  return normalized.slice(0, maxLength)
}

function sanitizeContext(value: unknown) {
  if (!isRecord(value)) return {}

  const entries = Object.entries(value).slice(0, 20).map(([key, nextValue]) => {
    if (typeof nextValue === 'string') {
      return [key, nextValue.slice(0, 500)] as const
    }

    if (typeof nextValue === 'number' || typeof nextValue === 'boolean' || nextValue === null) {
      return [key, nextValue] as const
    }

    if (Array.isArray(nextValue)) {
      return [key, nextValue.slice(0, 10)] as const
    }

    if (isRecord(nextValue)) {
      return [key, Object.fromEntries(Object.entries(nextValue).slice(0, 10))] as const
    }

    return [key, String(nextValue)] as const
  })

  return Object.fromEntries(entries)
}

function buildPrompt(body: GenerateStudyRequest) {
  const scripture = {
    title: body.scripture.title.trim(),
    gurmukhi: sanitizeOptionalString(body.scripture.gurmukhi),
    transliteration: sanitizeOptionalString(body.scripture.transliteration),
    translation: sanitizeOptionalString(body.scripture.translation),
  }
  const context = sanitizeContext(body.context)

  return [
    `Study mode: ${MODE_LABELS[body.mode]}.`,
    '',
    'Grounding scripture:',
    JSON.stringify(scripture, null, 2),
    '',
    'Additional app context:',
    JSON.stringify(context, null, 2),
    '',
    'Return strict JSON with this exact shape:',
    '{"title":"...","body":"...","bulletPoints":["..."],"reflectionPrompt":"..."}',
    '',
    'Rules:',
    '- Use only the supplied scripture and context.',
    '- Do not present the answer as Gurbani, doctrine, or authoritative translation.',
    '- Keep body concise and pastoral, with no more than two short paragraphs.',
    '- Provide 2 or 3 bullet points at most.',
    '- If the context is thin, say less rather than inventing details.',
  ].join('\n')
}

function extractResponseText(completion: any) {
  const content = completion?.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .filter(part => part?.type === 'text' && typeof part.text === 'string')
      .map(part => part.text.trim())
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  return ''
}

function parseAIResponse(rawText: string) {
  if (!rawText) return null

  try {
    return JSON.parse(stripCodeFence(rawText)) as AIResponseShape
  } catch {
    return null
  }
}

function normalizeBulletPoints(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function buildFallbackBody(body: GenerateStudyRequest) {
  const translation = sanitizeOptionalString(body.scripture.translation, 420)
  if (translation) {
    return translation
  }

  return 'NaamRas could not form a grounded study reflection from the supplied text. Please try again with more visible context from the current passage.'
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const auth = await requireAuthenticatedClient(request)
  if (auth.error || !auth.client || !auth.user) {
    return auth.error ?? jsonResponse({ error: 'Authentication failed.' }, 401)
  }

  const model = readFunctionSetting('INSFORGE_AI_MODEL')
  if (!model) {
    return jsonResponse({
      error: 'INSFORGE_AI_MODEL is not configured for generate-study-response.',
    }, 503)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400)
  }

  if (!isGenerateStudyRequest(body)) {
    return jsonResponse({ error: 'Invalid study request.' }, 400)
  }

  try {
    const completion = await auth.client.ai.chat.completions.create({
      model,
      temperature: 0.35,
      maxTokens: 500,
      messages: [
        {
          role: 'system',
          content: [
            'You are the NaamRas study assistant.',
            'You produce concise, grounded reflections for personal study.',
            'You must never present your answer as canonical Gurbani, official translation, hukam, or religious authority.',
            'You must stay inside the provided text and context only.',
            'Always return strict JSON and nothing else.',
          ].join(' '),
        },
        {
          role: 'user',
          content: buildPrompt(body),
        },
      ],
    })

    const rawText = extractResponseText(completion)
    const parsed = parseAIResponse(rawText)
    const response: GenerateStudyResponse = {
      mode: body.mode,
      title: sanitizeOptionalString(parsed?.title, 120) ?? body.scripture.title.trim(),
      body: sanitizeOptionalString(parsed?.body, 1200) ?? buildFallbackBody(body),
      bulletPoints: normalizeBulletPoints(parsed?.bulletPoints),
      reflectionPrompt: sanitizeOptionalString(parsed?.reflectionPrompt, 240) ?? null,
      guardrail: STUDY_GUARDRAIL,
    }

    return jsonResponse(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI study response failed.'
    return jsonResponse({ error: message }, 500)
  }
}
