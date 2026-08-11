type QueryValue = string | string[] | undefined

interface ShareRequest {
  query: Record<string, QueryValue>
}

interface ShareResponse {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

interface ShareLanding {
  canonicalUrl: string
  description: string
  destination: string
  eyebrow: string
  title: string
}

const SITE_ORIGIN = 'https://naamras.xyz'
const SHARE_IMAGE_URL = `${SITE_ORIGIN}/icons/icon-512.png`
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeDate(value: QueryValue): string | null {
  const candidate = firstQueryValue(value)?.trim() ?? ''
  const match = DATE_PATTERN.exec(candidate)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? candidate
    : null
}

function normalizePositiveInteger(value: QueryValue, maximum = Number.MAX_SAFE_INTEGER): number | null {
  const candidate = firstQueryValue(value)?.trim() ?? ''
  if (!/^\d+$/.test(candidate)) return null
  const number = Number(candidate)
  return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : null
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function buildShareLanding(query: Record<string, QueryValue>): ShareLanding | null {
  const kind = firstQueryValue(query.kind)

  if (kind === 'hukamnama') {
    const date = normalizeDate(query.date)
    if (!date) return null
    const readableDate = new Intl.DateTimeFormat('en-CA', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00Z`))

    return {
      canonicalUrl: `${SITE_ORIGIN}/h/${date}`,
      description: `Open the daily Hukamnama for ${readableDate} in NaamRas, with the available transliteration and meanings.`,
      destination: `/study?hukamnamaDate=${encodeURIComponent(date)}`,
      eyebrow: 'Daily Hukamnama',
      title: `Daily Hukamnama · ${readableDate} | NaamRas`,
    }
  }

  if (kind === 'personal') {
    const shabadId = normalizePositiveInteger(query.shabadId)
    const ang = normalizePositiveInteger(query.ang, 1430)
    const rawResumeVerseId = firstQueryValue(query.resumeVerseId)
    const resumeVerseId = rawResumeVerseId === undefined
      ? null
      : normalizePositiveInteger(query.resumeVerseId)
    if (!shabadId || !ang || (rawResumeVerseId !== undefined && !resumeVerseId)) return null

    const shortPath = `/p/${shabadId}/${ang}${resumeVerseId ? `/${resumeVerseId}` : ''}`
    const destination = new URLSearchParams({
      shabadId: String(shabadId),
      flow: 'ardaas-hukamnama',
      randomHukamnamaAng: String(ang),
    })
    if (resumeVerseId) destination.set('resumeVerseId', String(resumeVerseId))

    return {
      canonicalUrl: `${SITE_ORIGIN}${shortPath}`,
      description: `Open this personal Hukamnama from Sri Guru Granth Sahib Ji, Ang ${ang}, in NaamRas.`,
      destination: `/study?${destination.toString()}`,
      eyebrow: 'Personal Hukamnama',
      title: `Personal Hukamnama · Ang ${ang} | NaamRas`,
    }
  }

  return null
}

export function renderShareLanding(landing: ShareLanding): string {
  const title = escapeHtml(landing.title)
  const description = escapeHtml(landing.description)
  const canonicalUrl = escapeHtml(landing.canonicalUrl)
  const destination = escapeHtml(landing.destination)
  const eyebrow = escapeHtml(landing.eyebrow)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="NaamRas">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${SHARE_IMAGE_URL}">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:alt" content="NaamRas app icon">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SHARE_IMAGE_URL}">
    <meta name="theme-color" content="#070c0e">
    <style>
      :root{color-scheme:light dark;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f2f1e9;color:#322820}
      body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;box-sizing:border-box}
      main{width:min(100%,560px);border:1px solid rgba(50,40,32,.16);border-radius:24px;padding:32px;box-sizing:border-box;background:#fbfaf5;box-shadow:0 18px 60px rgba(50,40,32,.08)}
      p{line-height:1.6;color:#665d56}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#327d6b}
      h1{font-family:ui-serif,Georgia,serif;font-size:clamp(2rem,9vw,3.25rem);line-height:1;margin:.5rem 0 1rem}
      a{display:inline-flex;min-height:48px;align-items:center;justify-content:center;margin-top:1rem;padding:0 1.25rem;border-radius:12px;background:#322820;color:#fff;text-decoration:none;font-weight:700}
      @media(prefers-color-scheme:dark){:root{background:#070c0e;color:#f1eee4}main{background:#10191b;border-color:rgba(241,238,228,.15)}p{color:#c7c2b8}a{background:#e9dfc7;color:#10191b}}
    </style>
  </head>
  <body data-share-destination="${destination}">
    <main>
      <p class="eyebrow">${eyebrow}</p>
      <h1>${title.replace(' | NaamRas', '')}</h1>
      <p>${description}</p>
      <a href="${destination}">Open reading in NaamRas</a>
    </main>
    <script src="/share-redirect.js" defer></script>
  </body>
</html>`
}

export default function handler(request: ShareRequest, response: ShareResponse) {
  const landing = buildShareLanding(request.query)
  if (!landing) {
    response.statusCode = 302
    response.setHeader('Location', '/')
    response.setHeader('Cache-Control', 'no-store')
    response.end()
    return
  }

  response.statusCode = 200
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  response.setHeader('X-Robots-Tag', 'noindex, follow')
  response.end(renderShareLanding(landing))
}
