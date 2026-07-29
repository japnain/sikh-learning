const PRODUCTION_WEB_ORIGINS = new Set([
  "https://naamras.xyz",
  "https://www.naamras.xyz",
]);

const NATIVE_WEBVIEW_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
]);

export type RequestBodyErrorCode =
  | "invalid-json"
  | "invalid-object"
  | "request-too-large";

export class RequestBodyError extends Error {
  constructor(readonly code: RequestBodyErrorCode) {
    super(code);
    this.name = "RequestBodyError";
  }
}

function isLocalWebOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:")
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && url.username === ""
      && url.password === ""
      && url.origin === origin
    );
  } catch {
    return false;
  }
}

export function isAllowedNaamrasOrigin(origin: string) {
  return (
    PRODUCTION_WEB_ORIGINS.has(origin)
    || NATIVE_WEBVIEW_ORIGINS.has(origin)
    || isLocalWebOrigin(origin)
  );
}

export function secureCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
    "x-content-type-options": "nosniff",
  };

  if (origin && isAllowedNaamrasOrigin(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

export function secureJsonResponse(
  payload: unknown,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...secureCorsHeaders(origin),
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function hasJsonMediaType(request: Request) {
  return request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase() === "application/json";
}

export function getBearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  if (value.length > 8_192) return null;
  const match = value.match(
    /^Bearer ([A-Za-z0-9\-._~+/]+={0,2})$/i,
  );
  return match?.[1] ?? null;
}

export function requestExceedsContentLength(
  request: Request,
  maximumBytes: number,
) {
  const value = request.headers.get("content-length");
  if (value === null) return false;
  if (!/^\d+$/.test(value)) return true;
  const length = Number(value);
  return !Number.isSafeInteger(length) || length > maximumBytes;
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
        throw new RequestBodyError("request-too-large");
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

export async function readBoundedJsonObject(
  request: Request,
  maximumBytes: number,
) {
  if (requestExceedsContentLength(request, maximumBytes)) {
    throw new RequestBodyError("request-too-large");
  }

  const text = await readStreamText(request.body, maximumBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestBodyError("invalid-json");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestBodyError("invalid-object");
  }
  return parsed as Record<string, unknown>;
}
