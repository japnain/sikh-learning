const UPSTREAM_ORIGIN = Deno.env.get("BANIDB_API_ORIGIN") ?? "https://api.banidb.com";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  body: string;
  expiresAt: number;
  headers: HeadersInit;
  status: number;
};

const cache = new Map<string, CacheEntry>();

function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: origin ? "Origin" : "",
  };
}

function json(payload: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function buildURL(path: unknown, query: unknown) {
  if (typeof path !== "string" || !path.startsWith("/v2/")) {
    throw new Error("Only BaniDB v2 read paths are allowed.");
  }

  const url = new URL(path, UPSTREAM_ORIGIN);
  if (url.origin !== UPSTREAM_ORIGIN) {
    throw new Error("Cross-origin BaniDB requests are not allowed.");
  }

  if (query !== undefined && query !== null) {
    if (typeof query !== "object" || Array.isArray(query)) {
      throw new Error("Query must be an object.");
    }
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      if (!["string", "number", "boolean"].includes(typeof value)) {
        throw new Error(`Unsupported query value for ${key}.`);
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

Deno.serve(async request => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }

  let upstreamURL: URL;
  try {
    upstreamURL = buildURL(body.path, body.query);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid proxy request." }, 400, origin);
  }

  const cacheKey = upstreamURL.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, { status: cached.status, headers: { ...corsHeaders(origin), ...cached.headers } });
  }

  try {
    const upstream = await fetch(upstreamURL, { headers: { accept: "application/json" } });
    const bodyText = await upstream.text();
    const headers = {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": upstream.headers.get("cache-control") ?? "public, max-age=300",
    };
    if (upstream.ok) {
      cache.set(cacheKey, { body: bodyText, expiresAt: Date.now() + CACHE_TTL_MS, headers, status: upstream.status });
    }
    return new Response(bodyText, { status: upstream.status, headers: { ...corsHeaders(origin), ...headers } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to reach BaniDB." }, 502, origin);
  }
});
