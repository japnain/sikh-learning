import {
  getBearerToken, hasJsonMediaType, isAllowedNaamrasOrigin,
  readBoundedJsonObject, RequestBodyError,
} from '../_shared/secure-http.ts';
import {
  isPrivateAsset, isPrivateBookMetadata, publicBookFields, validEdition, validId,
  PRIVATE_RANGE_MAX_BYTES, PRIVATE_STATE_MAX_BYTES,
  type PrivateAsset, type PrivateBookMetadata,
} from './contract.ts';
import { validStateTimestamp, PrivateStateWriteError } from './state.ts';
import { validPrivateReadingState } from './annotations.ts';

export interface PrivateLibraryIdentity { userId: string; sessionId: string }
export interface PrivateLibraryService {
  authenticate(): Promise<PrivateLibraryIdentity | null>;
  authorize(identity: PrivateLibraryIdentity): Promise<'allowed' | 'denied' | 'rate_limited'>;
  listBooks(): Promise<PrivateBookMetadata[]>;
  getBook(bookId: string): Promise<PrivateBookMetadata | null>;
  getAsset(bookId: string, assetId: string): Promise<PrivateAsset | null>;
  fetchAsset(asset: PrivateAsset, range: string | null, signal: AbortSignal): Promise<Response>;
  getState(userId: string, bookId: string, editionVersion: string): Promise<Record<string, unknown> | null>;
  putState(userId: string, bookId: string, editionVersion: string, state: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface PrivateLibraryServiceConfig {
  supabaseUrl: string; anonKey: string; serviceRoleKey: string; token: string;
}
export interface PrivateLibraryHandlerOptions {
  readEnv(name: string): string | null | undefined;
  createService(config: PrivateLibraryServiceConfig): PrivateLibraryService;
}

function headers(origin: string | null, extra: Record<string, string> = {}) {
  return {
    ...(origin && isAllowedNaamrasOrigin(origin) ? { 'access-control-allow-origin': origin } : {}),
    'access-control-allow-methods': 'GET, HEAD, PUT, OPTIONS',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, range, if-range, if-none-match, if-modified-since',
    'access-control-expose-headers': 'Content-Type, Content-Length, Content-Range, Accept-Ranges, Retry-After',
    'cache-control': 'private, no-store', pragma: 'no-cache', expires: '0',
    vary: 'Origin, Authorization', 'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow, noarchive',
    ...extra,
  };
}

function json(request: Request, payload: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(payload), {
    status, headers: headers(request.headers.get('origin'), { 'content-type': 'application/json; charset=utf-8', ...extra }),
  });
}

function error(request: Request, status: number, code: string, extra: Record<string, string> = {}) {
  return json(request, { error: code }, status, extra);
}

/** Single bounded range only; never forward arbitrary client Range syntax upstream. */
export function parsePrivateRange(value: string | null, size: number): { start: number; end: number } | null | false {
  if (value === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return false;
  let start: number;
  let end: number;
  if (!match[1]) {
    const count = Number(match[2]);
    if (!Number.isSafeInteger(count) || count <= 0 || count > PRIVATE_RANGE_MAX_BYTES) return false;
    start = Math.max(0, size - count);
    end = size - 1;
  } else {
    start = Number(match[1]);
    if (match[2] && !Number.isSafeInteger(Number(match[2]))) return false;
    end = match[2] ? Math.min(Number(match[2]), size - 1) : Math.min(size - 1, start + PRIVATE_RANGE_MAX_BYTES - 1);
  }
  return Number.isSafeInteger(start) && Number.isSafeInteger(end)
    && start >= 0 && start < size && end >= start && end - start + 1 <= PRIVATE_RANGE_MAX_BYTES
    ? { start, end } : false;
}

function boundedStream(source: ReadableStream<Uint8Array>, expected: number, release: () => void) {
  const reader = source.getReader();
  let received = 0;
  let finished = false;
  const finish = () => { if (!finished) { finished = true; release(); } };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          if (received !== expected) throw new Error('Private asset incomplete.');
          finish(); controller.close(); return;
        }
        received += result.value.byteLength;
        if (received > expected) {
          await reader.cancel();
          throw new Error('Private asset exceeded its declared size.');
        }
        controller.enqueue(result.value);
      } catch {
        finish();
        controller.error(new Error('Private asset transfer interrupted.'));
      }
    },
    async cancel(reason) { finish(); await reader.cancel(reason); },
  });
}

export function createPrivateLibraryHandler(options: PrivateLibraryHandlerOptions) {
  // Request rate is enforced in the database across all isolates. This smaller
  // per-isolate limit prevents one client from holding unbounded open streams.
  const assetStreams = new Map<string, number>();
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedNaamrasOrigin(origin)) return error(request, 403, 'access-denied');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
    if (!['GET', 'HEAD', 'PUT'].includes(request.method)) return error(request, 405, 'method-not-allowed', { allow: 'GET, HEAD, PUT, OPTIONS' });
    const token = getBearerToken(request);
    if (!token) return error(request, 401, 'authentication-required');
    const supabaseUrl = options.readEnv('SUPABASE_URL')?.trim();
    const anonKey = options.readEnv('SUPABASE_ANON_KEY')?.trim();
    const serviceRoleKey = options.readEnv('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return error(request, 503, 'private-library-unavailable');

    try {
      const service = options.createService({ supabaseUrl, anonKey, serviceRoleKey, token });
      const identity = await service.authenticate();
      if (!identity) return error(request, 401, 'authentication-required');
      const access = await service.authorize(identity);
      const params = new URL(request.url).searchParams;
      const action = params.get('action');
      if (access === 'rate_limited') return error(request, 429, 'try-again-later', { 'retry-after': '60' });
      if (action === 'capability' && request.method === 'GET') return json(request, { allowed: access === 'allowed' });
      if (access !== 'allowed') return error(request, 403, 'access-denied');
      if (request.method === 'PUT' && action !== 'state') return error(request, 405, 'method-not-allowed');
      if (action === 'catalog' && request.method === 'GET') {
        const books = await service.listBooks();
        if (books.length > 500 || !books.every(isPrivateBookMetadata)) throw new Error('Invalid private catalogue.');
        return json(request, { books: books.map(publicBookFields) });
      }
      const bookId = params.get('bookId');
      if (!validId(bookId) || !['book', 'asset', 'state'].includes(action ?? '')) return error(request, 404, 'not-found');
      const book = await service.getBook(bookId);
      if (!book) return error(request, 404, 'not-found');
      if (!isPrivateBookMetadata(book) || book.id !== bookId) throw new Error('Invalid private book.');
      if (action === 'book' && request.method === 'GET') return json(request, { book: publicBookFields(book) });
      if (action === 'state' && request.method !== 'HEAD') {
        const editionVersion = params.get('editionVersion');
        if (!validEdition(editionVersion)) return error(request, 400, 'invalid-edition');
        if (request.method === 'GET') {
          const state = await service.getState(identity.userId, bookId, editionVersion);
          if (state !== null && !validPrivateReadingState(state)) throw new Error('Invalid private state.');
          return json(request, { state });
        }
        if (book.editionVersion !== editionVersion) return error(request, 409, 'edition-changed');
        if (!hasJsonMediaType(request)) return error(request, 415, 'json-required');
        let body: Record<string, unknown>;
        try { body = await readBoundedJsonObject(request, PRIVATE_STATE_MAX_BYTES); }
        catch (cause) {
          return error(request, cause instanceof RequestBodyError && cause.code === 'request-too-large' ? 413 : 400, 'invalid-state');
        }
        if (Object.keys(body).length !== 1 || !validPrivateReadingState(body.state, book)
          || !validStateTimestamp(body.state.updatedAt)) return error(request, 400, 'invalid-state');
        try {
          const saved = await service.putState(identity.userId, bookId, editionVersion, body.state);
          if (!validPrivateReadingState(saved)) throw new Error('Invalid saved state.');
          return json(request, { state: saved });
        } catch (cause) {
          if (cause instanceof PrivateStateWriteError) return error(request,
            cause.code === 'capacity' ? 413 : cause.code === 'edition-changed' ? 409 : 400,
            cause.code === 'capacity' ? 'state-capacity-exceeded' : cause.code === 'edition-changed' ? 'edition-changed' : 'invalid-state');
          throw cause;
        }
      }
      if (action !== 'asset') return error(request, 405, 'method-not-allowed');
      const assetId = params.get('assetId');
      if (!validId(assetId)) return error(request, 404, 'not-found');
      const asset = await service.getAsset(bookId, assetId);
      if (!asset) return error(request, 404, 'not-found');
      if (!isPrivateAsset(asset, bookId, assetId)) throw new Error('Invalid private asset.');
      const range = parsePrivateRange(request.headers.get('range'), asset.size);
      if (range === false) return error(request, 416, 'range-not-satisfiable', { 'content-range': `bytes */${asset.size}` });
      const length = range ? range.end - range.start + 1 : asset.size;
      const assetHeaders = headers(origin, {
        'content-type': asset.content_type, 'content-length': String(length),
        'accept-ranges': 'bytes', 'content-security-policy': "default-src 'none'; sandbox",
        'content-disposition': asset.content_type === 'application/epub+zip' ? 'attachment' : 'inline',
        ...(range ? { 'content-range': `bytes ${range.start}-${range.end}/${asset.size}` } : {}),
      });
      if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers: assetHeaders });
      const count = assetStreams.get(identity.userId) ?? 0;
      if (count >= 8) return error(request, 429, 'try-again-later', { 'retry-after': '2' });
      assetStreams.set(identity.userId, count + 1);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        const remaining = (assetStreams.get(identity.userId) ?? 1) - 1;
        if (remaining > 0) assetStreams.set(identity.userId, remaining); else assetStreams.delete(identity.userId);
      };
      try {
        const remote = await service.fetchAsset(asset, range ? `bytes=${range.start}-${range.end}` : null, request.signal);
        const expectedStatus = range ? 206 : 200;
        const declaredLength = remote.headers.get('content-length');
        if (remote.status !== expectedStatus || !remote.body
          || (declaredLength !== null && Number(declaredLength) !== length)
          || (range && remote.headers.get('content-range') !== `bytes ${range.start}-${range.end}/${asset.size}`)) {
          await remote.body?.cancel();
          throw new Error('Unexpected private asset response.');
        }
        // Never propagate storage cache headers, redirects, filenames or diagnostics.
        return new Response(boundedStream(remote.body, length, release), { status: expectedStatus, headers: assetHeaders });
      } catch { release(); return error(request, 502, 'private-asset-unavailable'); }
    } catch {
      // Authorization/database failures fail closed without leaking IDs or data.
      return error(request, 503, 'private-library-unavailable');
    }
  };
}
