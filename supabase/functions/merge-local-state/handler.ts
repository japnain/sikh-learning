import {
  CLOUD_SNAPSHOT_VERSION,
  SnapshotValidationError,
  buildRemoteSnapshot,
  normalizeActivityEvents,
  parseMergeSnapshot,
  toDatabaseSyncRecords,
  type DatabaseSyncRecord,
  type Json,
} from "./contract.ts";
import {
  RequestBodyError,
  getBearerToken,
  hasJsonMediaType,
  isAllowedNaamrasOrigin,
  readBoundedJsonObject,
  requestExceedsContentLength,
  secureCorsHeaders,
  secureJsonResponse,
} from "../_shared/secure-http.ts";

export const MERGE_LOCAL_STATE_MAX_REQUEST_BYTES = 2 * 1024 * 1024;

interface MergeService {
  authenticate: () => Promise<string | null>;
  mergeSnapshot: (
    incomingRecords: DatabaseSyncRecord[],
    incomingEvents: Array<Record<string, Json | undefined>>,
  ) => Promise<{ data: unknown; failed: boolean }>;
}

interface MergeServiceConfig {
  anonKey: string;
  supabaseUrl: string;
  token: string;
}

export interface MergeLocalStateHandlerOptions {
  createService: (config: MergeServiceConfig) => MergeService;
  readEnv: (name: string) => string | null | undefined;
}

function readRequiredEnv(
  readEnv: MergeLocalStateHandlerOptions["readEnv"],
  name: string,
) {
  return readEnv(name)?.trim() || null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function createMergeLocalStateHandler(
  options: MergeLocalStateHandlerOptions,
) {
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedNaamrasOrigin(origin)) {
      return secureJsonResponse({ error: "Origin not allowed." }, 403, origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: secureCorsHeaders(origin),
      });
    }

    if (request.method !== "POST") {
      return secureJsonResponse(
        { error: "Method not allowed." },
        405,
        origin,
        { allow: "POST, OPTIONS" },
      );
    }

    if (!hasJsonMediaType(request)) {
      return secureJsonResponse(
        { error: "Content-Type must be application/json." },
        415,
        origin,
      );
    }

    const token = getBearerToken(request);
    if (!token) {
      return secureJsonResponse(
        { error: "A valid authorization bearer token is required." },
        401,
        origin,
      );
    }

    if (
      requestExceedsContentLength(
        request,
        MERGE_LOCAL_STATE_MAX_REQUEST_BYTES,
      )
    ) {
      return secureJsonResponse(
        { error: "Request body is too large." },
        413,
        origin,
      );
    }

    const supabaseUrl = readRequiredEnv(options.readEnv, "SUPABASE_URL");
    const anonKey = readRequiredEnv(options.readEnv, "SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return secureJsonResponse(
        { error: "Cloud sync is not configured." },
        503,
        origin,
      );
    }

    let service: MergeService;
    try {
      service = options.createService({ supabaseUrl, anonKey, token });
    } catch {
      return secureJsonResponse(
        { error: "Cloud sync is temporarily unavailable." },
        503,
        origin,
      );
    }

    let userId: string | null;
    try {
      userId = await service.authenticate();
    } catch {
      return secureJsonResponse(
        { error: "Cloud sync authentication is temporarily unavailable." },
        502,
        origin,
      );
    }
    if (!userId) {
      return secureJsonResponse(
        { error: "Invalid Supabase session." },
        401,
        origin,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await readBoundedJsonObject(
        request,
        MERGE_LOCAL_STATE_MAX_REQUEST_BYTES,
      );
    } catch (error) {
      if (
        error instanceof RequestBodyError
        && error.code === "request-too-large"
      ) {
        return secureJsonResponse(
          { error: "Request body is too large." },
          413,
          origin,
        );
      }
      return secureJsonResponse(
        { error: "Invalid JSON request body." },
        400,
        origin,
      );
    }

    let snapshot;
    try {
      snapshot = parseMergeSnapshot(body.snapshot);
    } catch (error) {
      if (error instanceof SnapshotValidationError) {
        return secureJsonResponse(
          { error: error.message, code: error.code },
          400,
          origin,
        );
      }
      return secureJsonResponse(
        { error: "Cloud snapshot validation failed." },
        400,
        origin,
      );
    }

    const incomingRecords = toDatabaseSyncRecords(snapshot, userId);
    const incomingEvents = normalizeActivityEvents(snapshot, userId);
    let mergeResult: unknown;
    try {
      const result = await service.mergeSnapshot(
        incomingRecords,
        incomingEvents,
      );
      if (result.failed) {
        return secureJsonResponse({
          error: "Cloud sync database merge failed.",
          code: "database-merge-failed",
        }, 502, origin);
      }
      mergeResult = result.data;
    } catch {
      return secureJsonResponse({
        error: "Cloud sync database merge failed.",
        code: "database-merge-failed",
      }, 502, origin);
    }

    if (
      !isObject(mergeResult)
      || mergeResult.version !== CLOUD_SNAPSHOT_VERSION
      || mergeResult.complete !== true
      || !isTimestamp(mergeResult.mergedAt)
      || !Array.isArray(mergeResult.records)
      || !Array.isArray(mergeResult.acknowledgedEventIds)
      || !mergeResult.acknowledgedEventIds.every(
        (id) => typeof id === "string",
      )
    ) {
      return secureJsonResponse({
        error: "Cloud sync database returned an incomplete result.",
        code: "incomplete-database-result",
      }, 502, origin);
    }

    const acknowledgedEventIds = mergeResult.acknowledgedEventIds as string[];
    const acknowledged = new Set(acknowledgedEventIds);
    if (
      snapshot.activityEvents.some(
        (event) => !acknowledged.has(String(event.id)),
      )
    ) {
      return secureJsonResponse({
        error: "Cloud sync did not durably store every pending activity event.",
        code: "activity-events-not-acknowledged",
      }, 502, origin);
    }

    let remoteSnapshot;
    try {
      remoteSnapshot = buildRemoteSnapshot(
        mergeResult.records,
        mergeResult.mergedAt,
      );
    } catch {
      return secureJsonResponse({
        error: "Cloud sync database returned an invalid remote snapshot.",
        code: "invalid-remote-snapshot",
      }, 502, origin);
    }

    return secureJsonResponse({
      version: CLOUD_SNAPSHOT_VERSION,
      complete: true,
      acknowledgedEventIds,
      mergedAt: mergeResult.mergedAt,
      snapshot: remoteSnapshot,
    }, 200, origin);
  };
}
