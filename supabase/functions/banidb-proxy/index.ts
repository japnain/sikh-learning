const DEFAULT_UPSTREAM_ORIGIN = "https://api.banidb.com";
export const BANIDB_CACHE_TTL_MS = 5 * 60 * 1000;
export const BANIDB_MAX_CACHE_ENTRIES = 200;
export const BANIDB_MAX_CACHE_BYTES = 32 * 1024 * 1024;
export const BANIDB_MAX_REQUEST_BYTES = 4 * 1024;
export const BANIDB_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
export const BANIDB_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const BANIDB_RATE_LIMIT_REQUESTS = 120;
export const BANIDB_MAX_RATE_LIMIT_ENTRIES = 2_000;
const UPSTREAM_TIMEOUT_MS = 12_000;

const DEFAULT_WEB_ORIGINS = new Set([
  "https://naamras.xyz",
  "https://www.naamras.xyz",
]);
const MOBILE_WEBVIEW_ORIGINS = new Set([
  // Capacitor uses capacitor://localhost on iOS and http://localhost on Android.
  "capacitor://localhost",
  // Retained for Ionic-compatible webviews used by local native tooling.
  "ionic://localhost",
]);
const SEARCH_TYPES = new Set(["0", "1", "2", "3", "4", "8"]);
const SEARCH_SOURCES = new Set(["all", "G", "D", "B", "A", "R"]);
const POSITIVE_ID = "[1-9]\\d{0,8}";

export interface BanidbCacheEntry {
  body: string;
  byteLength: number;
  expiresAt: number;
  status: number;
}

export interface BanidbRateLimitEntry {
  count: number;
  resetAt: number;
}

interface BanidbProxyOptions {
  allowedOrigins?: readonly string[];
  cache?: Map<string, BanidbCacheEntry>;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  maxCacheBytes?: number;
  maxCacheEntries?: number;
  maxRateLimitEntries?: number;
  now?: () => number;
  rateLimitRequests?: number;
  rateLimitWindowMs?: number;
  rateLimits?: Map<string, BanidbRateLimitEntry>;
  upstreamOrigin?: string;
}

interface DenoRuntime {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
}

function normalizeUpstreamOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("BANIDB_API_ORIGIN must be an HTTPS origin.");
  }
  return url.origin;
}

function isLocalWebOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

export function isAllowedBanidbOrigin(
  origin: string,
  additionalOrigins: readonly string[] = [],
) {
  return (
    DEFAULT_WEB_ORIGINS.has(origin) ||
    MOBILE_WEBVIEW_ORIGINS.has(origin) ||
    additionalOrigins.includes(origin) ||
    isLocalWebOrigin(origin)
  );
}

function corsHeaders(
  origin: string | null,
  additionalOrigins: readonly string[],
) {
  const headers: Record<string, string> = {
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    "access-control-expose-headers":
      "retry-after, x-cache, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset",
    vary: "Origin",
    "x-content-type-options": "nosniff",
  };

  if (origin && isAllowedBanidbOrigin(origin, additionalOrigins)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function json(
  payload: unknown,
  status: number,
  origin: string | null,
  additionalOrigins: readonly string[],
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin, additionalOrigins),
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function decodeTextSegment(segment: string, maximumLength: number) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new Error("Path contains invalid encoding.");
  }

  if (
    !decoded.trim() ||
    decoded.length > maximumLength ||
    Array.from(decoded).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 31 || codePoint === 127;
    })
  ) {
    throw new Error("Path text is invalid.");
  }
}

type RouteKind = "read" | "search";

function validatePath(path: string): RouteKind {
  if (
    path.length > 512 ||
    !path.startsWith("/v2/") ||
    path.includes("?") ||
    path.includes("#") ||
    /\s/.test(path)
  ) {
    throw new Error("Unsupported BaniDB path.");
  }

  const simplePaths = new Set([
    "/v2/banis",
    "/v2/amritkeertan",
    "/v2/hukamnamas",
    "/v2/rehats",
  ]);
  if (simplePaths.has(path)) return "read";

  const numericPatterns = [
    new RegExp(`^/v2/shabads/${POSITIVE_ID}$`),
    new RegExp(`^/v2/banis/${POSITIVE_ID}$`),
    new RegExp(`^/v2/amritkeertan/index/${POSITIVE_ID}$`),
    new RegExp(`^/v2/rehats/${POSITIVE_ID}$`),
    new RegExp(`^/v2/rehats/${POSITIVE_ID}/chapters/${POSITIVE_ID}$`),
  ];
  if (numericPatterns.some((pattern) => pattern.test(path))) return "read";

  const angPattern = new RegExp(`^/v2/angs/${POSITIVE_ID}/(G|D|B|A)$`);
  if (angPattern.test(path)) return "read";

  const datedHukamnama = path.match(
    /^\/v2\/hukamnamas\/(\d{4})\/(\d{2})\/(\d{2})$/,
  );
  if (datedHukamnama) {
    const [, year, month, day] = datedHukamnama;
    const candidate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    if (
      !Number.isNaN(candidate.getTime()) &&
      candidate.getUTCFullYear() === Number(year) &&
      candidate.getUTCMonth() + 1 === Number(month) &&
      candidate.getUTCDate() === Number(day)
    ) {
      return "read";
    }
    throw new Error("Hukamnama date is invalid.");
  }

  const searchMatch = path.match(/^\/v2\/search\/([^/]+)$/);
  if (searchMatch?.[1]) {
    decodeTextSegment(searchMatch[1], 160);
    return "search";
  }

  const koshSearchMatch = path.match(/^\/v2\/kosh\/search\/([^/]+)$/);
  if (koshSearchMatch?.[1]) {
    decodeTextSegment(koshSearchMatch[1], 80);
    return "read";
  }

  const koshMatch = path.match(/^\/v2\/kosh\/([^/]+)$/);
  if (koshMatch?.[1]) {
    decodeTextSegment(koshMatch[1], 80);
    return "read";
  }

  throw new Error("Unsupported BaniDB path.");
}

function validateQuery(query: unknown, routeKind: RouteKind) {
  if (query === undefined || query === null) {
    if (routeKind === "search") {
      throw new Error("Search requests require searchtype and source.");
    }
    return {} as Record<string, string>;
  }

  if (typeof query !== "object" || Array.isArray(query)) {
    throw new Error("Query must be an object.");
  }

  const entries = Object.entries(query as Record<string, unknown>);
  if (routeKind === "read") {
    if (entries.length > 0) {
      throw new Error("This BaniDB path does not accept query parameters.");
    }
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!["searchtype", "source"].includes(key) || typeof value !== "string") {
      throw new Error("Unsupported search query.");
    }
    normalized[key] = value;
  }

  if (
    !SEARCH_TYPES.has(normalized.searchtype ?? "") ||
    !SEARCH_SOURCES.has(normalized.source ?? "") ||
    entries.length !== 2
  ) {
    throw new Error("Unsupported search query.");
  }
  return normalized;
}

export function buildBanidbUpstreamUrl(
  path: unknown,
  query: unknown,
  upstreamOrigin = DEFAULT_UPSTREAM_ORIGIN,
) {
  if (typeof path !== "string") {
    throw new Error("Request body must include a string path.");
  }

  const routeKind = validatePath(path);
  const normalizedQuery = validateQuery(query, routeKind);
  const url = new URL(path, normalizeUpstreamOrigin(upstreamOrigin));
  if (url.pathname !== path) {
    throw new Error("Unsupported BaniDB path.");
  }

  for (
    const [key, value] of Object.entries(normalizedQuery).sort((
      [left],
      [right],
    ) => left.localeCompare(right))
  ) {
    url.searchParams.set(key, value);
  }
  return url;
}

function pruneExpiredCache(cache: Map<string, BanidbCacheEntry>, now: number) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function getCached(
  cache: Map<string, BanidbCacheEntry>,
  key: string,
  now: number,
) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, cached);
  return cached;
}

function setCached(
  cache: Map<string, BanidbCacheEntry>,
  key: string,
  entry: BanidbCacheEntry,
  maximumEntries: number,
  maximumBytes: number,
) {
  const entryBytes = entry.byteLength;
  if (entryBytes > maximumBytes) return;

  let cachedBytes = 0;
  for (const cached of cache.values()) {
    cachedBytes += cached.byteLength;
  }

  while (
    cache.size >= maximumEntries ||
    cachedBytes + entryBytes > maximumBytes
  ) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    const oldest = cache.get(oldestKey);
    if (oldest) cachedBytes -= oldest.byteLength;
    cache.delete(oldestKey);
  }
  cache.set(key, entry);
}

interface BanidbRateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

function normalizedClientAddress(value: string | null) {
  const candidate = value?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (
    !candidate ||
    candidate.length > 64 ||
    !/^[0-9a-f:.]+$/i.test(candidate)
  ) {
    return null;
  }
  return candidate;
}

function rateLimitClientKey(request: Request) {
  for (
    const header of ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]
  ) {
    const address = normalizedClientAddress(request.headers.get(header));
    if (address) return `ip:${address}`;
  }
  return "unidentified-client";
}

function pruneExpiredRateLimits(
  rateLimits: Map<string, BanidbRateLimitEntry>,
  now: number,
) {
  // Entries are inserted in reset order because every window has equal length.
  // Stop at the first active entry so steady-state requests remain O(1).
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt > now) break;
    rateLimits.delete(key);
  }
}

function consumeRateLimit(
  rateLimits: Map<string, BanidbRateLimitEntry>,
  key: string,
  now: number,
  windowMs: number,
  requestLimit: number,
  maximumEntries: number,
  overflow: BanidbRateLimitEntry | null,
) {
  pruneExpiredRateLimits(rateLimits, now);

  let entry = rateLimits.get(key);
  let nextOverflow = overflow;
  if (!entry) {
    if (rateLimits.size < maximumEntries) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimits.set(key, entry);
    } else {
      if (!nextOverflow || nextOverflow.resetAt <= now) {
        nextOverflow = { count: 0, resetAt: now + windowMs };
      }
      entry = nextOverflow;
    }
  }

  entry.count += 1;
  return {
    decision: {
      allowed: entry.count <= requestLimit,
      limit: requestLimit,
      remaining: Math.max(0, requestLimit - entry.count),
      resetAt: entry.resetAt,
    } satisfies BanidbRateLimitDecision,
    overflow: nextOverflow,
  };
}

function rateLimitHeaders(
  decision: BanidbRateLimitDecision,
  now: number,
) {
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(decision.limit),
    "x-ratelimit-remaining": String(decision.remaining),
    "x-ratelimit-reset": String(Math.ceil(decision.resetAt / 1000)),
  };
  if (!decision.allowed) {
    headers["retry-after"] = String(
      Math.max(1, Math.ceil((decision.resetAt - now) / 1000)),
    );
  }
  return headers;
}

async function parseRequestBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) && contentLength > BANIDB_MAX_REQUEST_BYTES
  ) {
    throw new Error("request-too-large");
  }

  let bodyText: string;
  try {
    bodyText = await readStreamText(request.body, BANIDB_MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof Error && error.message === "stream-too-large") {
      throw new Error("request-too-large");
    }
    throw error;
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error("invalid-json");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("invalid-body");
  }
  const keys = Object.keys(body);
  if (keys.some((key) => !["path", "query"].includes(key)) || keys.length > 2) {
    throw new Error("invalid-body");
  }
  return body as Record<string, unknown>;
}

async function readStreamText(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) {
  if (!stream) return "";

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("stream-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function successfulProxyResponse(
  entry: BanidbCacheEntry,
  origin: string | null,
  additionalOrigins: readonly string[],
  cacheStatus: "HIT" | "MISS",
  extraHeaders: Record<string, string> = {},
) {
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      ...corsHeaders(origin, additionalOrigins),
      "cache-control": "public, max-age=300, stale-while-revalidate=60",
      "content-type": "application/json; charset=utf-8",
      "x-cache": cacheStatus,
      ...extraHeaders,
    },
  });
}

export function createBanidbProxyHandler(options: BanidbProxyOptions = {}) {
  const additionalOrigins = options.allowedOrigins ?? [];
  const cache = options.cache ?? new Map<string, BanidbCacheEntry>();
  const cacheTtlMs = options.cacheTtlMs ?? BANIDB_CACHE_TTL_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxCacheBytes = options.maxCacheBytes ?? BANIDB_MAX_CACHE_BYTES;
  const maxCacheEntries = options.maxCacheEntries ?? BANIDB_MAX_CACHE_ENTRIES;
  const maxRateLimitEntries = options.maxRateLimitEntries ??
    BANIDB_MAX_RATE_LIMIT_ENTRIES;
  const now = options.now ?? Date.now;
  const rateLimitRequests = options.rateLimitRequests ??
    BANIDB_RATE_LIMIT_REQUESTS;
  const rateLimitWindowMs = options.rateLimitWindowMs ??
    BANIDB_RATE_LIMIT_WINDOW_MS;
  const rateLimits = options.rateLimits ??
    new Map<string, BanidbRateLimitEntry>();
  let overflowRateLimit: BanidbRateLimitEntry | null = null;
  const upstreamOrigin = normalizeUpstreamOrigin(
    options.upstreamOrigin ?? DEFAULT_UPSTREAM_ORIGIN,
  );

  if (!Number.isSafeInteger(maxCacheEntries) || maxCacheEntries <= 0) {
    throw new Error("maxCacheEntries must be a positive integer.");
  }
  if (!Number.isSafeInteger(maxCacheBytes) || maxCacheBytes <= 0) {
    throw new Error("maxCacheBytes must be a positive integer.");
  }
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs <= 0) {
    throw new Error("cacheTtlMs must be positive.");
  }
  if (
    !Number.isSafeInteger(maxRateLimitEntries) ||
    maxRateLimitEntries <= 0
  ) {
    throw new Error("maxRateLimitEntries must be a positive integer.");
  }
  if (!Number.isSafeInteger(rateLimitRequests) || rateLimitRequests <= 0) {
    throw new Error("rateLimitRequests must be a positive integer.");
  }
  if (!Number.isFinite(rateLimitWindowMs) || rateLimitWindowMs <= 0) {
    throw new Error("rateLimitWindowMs must be positive.");
  }

  return async (request: Request) => {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedBanidbOrigin(origin, additionalOrigins)) {
      return json(
        { error: "Origin not allowed." },
        403,
        origin,
        additionalOrigins,
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, additionalOrigins),
      });
    }

    const requestTime = now();
    const rateLimitResult = consumeRateLimit(
      rateLimits,
      rateLimitClientKey(request),
      requestTime,
      rateLimitWindowMs,
      rateLimitRequests,
      maxRateLimitEntries,
      overflowRateLimit,
    );
    overflowRateLimit = rateLimitResult.overflow;
    const limitedHeaders = rateLimitHeaders(
      rateLimitResult.decision,
      requestTime,
    );
    const limitedJson = (
      payload: unknown,
      status: number,
      extraHeaders: Record<string, string> = {},
    ) =>
      json(payload, status, origin, additionalOrigins, {
        ...limitedHeaders,
        ...extraHeaders,
      });

    if (!rateLimitResult.decision.allowed) {
      return limitedJson(
        { error: "Too many BaniDB requests. Please try again later." },
        429,
      );
    }

    if (request.method !== "POST") {
      return limitedJson(
        { error: "Method not allowed." },
        405,
        {
          allow: "POST, OPTIONS",
        },
      );
    }

    const contentType = request.headers.get("content-type");
    if (
      contentType?.split(";", 1)[0]?.trim().toLowerCase() !==
        "application/json"
    ) {
      return limitedJson(
        { error: "Content-Type must be application/json." },
        415,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await parseRequestBody(request);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "request-too-large") {
        return limitedJson(
          { error: "Request body is too large." },
          413,
        );
      }
      return limitedJson(
        { error: "Invalid JSON request body." },
        400,
      );
    }

    let upstreamUrl: URL;
    try {
      upstreamUrl = buildBanidbUpstreamUrl(
        body.path,
        body.query,
        upstreamOrigin,
      );
    } catch {
      return limitedJson(
        { error: "Unsupported BaniDB request." },
        400,
      );
    }

    pruneExpiredCache(cache, requestTime);
    const cacheKey = upstreamUrl.toString();
    const cached = getCached(cache, cacheKey, requestTime);
    if (cached) {
      return successfulProxyResponse(
        cached,
        origin,
        additionalOrigins,
        "HIT",
        limitedHeaders,
      );
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      UPSTREAM_TIMEOUT_MS,
    );
    let upstream: Response;
    try {
      upstream = await fetchImpl(upstreamUrl, {
        headers: { accept: "application/json" },
        redirect: "error",
        signal: abortController.signal,
      });
    } catch (error) {
      const timedOut = abortController.signal.aborted ||
        (error instanceof Error && error.name === "AbortError");
      return limitedJson(
        {
          error: timedOut
            ? "BaniDB request timed out."
            : "Unable to reach BaniDB.",
        },
        timedOut ? 504 : 502,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      void upstream.body?.cancel().catch(() => undefined);
      const status = upstream.status === 404
        ? 404
        : upstream.status === 429
        ? 429
        : 502;
      return limitedJson(
        { error: "BaniDB request failed." },
        status,
      );
    }

    const responseContentType =
      upstream.headers.get("content-type")?.toLowerCase() ?? "";
    const responseLength = Number(upstream.headers.get("content-length"));
    if (
      !responseContentType.includes("application/json") ||
      (Number.isFinite(responseLength) &&
        responseLength > BANIDB_MAX_RESPONSE_BYTES)
    ) {
      void upstream.body?.cancel().catch(() => undefined);
      return limitedJson(
        { error: "BaniDB returned an invalid response." },
        502,
      );
    }

    let bodyText: string;
    try {
      bodyText = await readStreamText(
        upstream.body,
        BANIDB_MAX_RESPONSE_BYTES,
      );
    } catch {
      return limitedJson(
        { error: "BaniDB response is too large." },
        502,
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      return limitedJson(
        { error: "BaniDB returned invalid JSON." },
        502,
      );
    }
    if (parsedBody === null || typeof parsedBody !== "object") {
      return limitedJson(
        { error: "BaniDB returned an invalid response." },
        502,
      );
    }

    const serializedBody = JSON.stringify(parsedBody);
    const entry: BanidbCacheEntry = {
      body: serializedBody,
      byteLength: new TextEncoder().encode(serializedBody).byteLength,
      expiresAt: requestTime + cacheTtlMs,
      status: upstream.status,
    };
    setCached(cache, cacheKey, entry, maxCacheEntries, maxCacheBytes);
    return successfulProxyResponse(
      entry,
      origin,
      additionalOrigins,
      "MISS",
      limitedHeaders,
    );
  };
}

function parseAdditionalOrigins(value: string | undefined) {
  return value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

const denoRuntime =
  (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
if (denoRuntime) {
  denoRuntime.serve(createBanidbProxyHandler({
    allowedOrigins: parseAdditionalOrigins(
      denoRuntime.env.get("BANIDB_ALLOWED_ORIGINS"),
    ),
    upstreamOrigin: denoRuntime.env.get("BANIDB_API_ORIGIN") ??
      DEFAULT_UPSTREAM_ORIGIN,
  }));
}
