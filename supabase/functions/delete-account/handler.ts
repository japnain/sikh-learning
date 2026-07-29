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

export const DELETE_ACCOUNT_MAX_REQUEST_BYTES = 1_024;

interface DeleteAccountService {
  authenticate: () => Promise<string | null>;
  deleteUser: (userId: string) => Promise<boolean>;
}

interface DeleteAccountServiceConfig {
  anonKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  token: string;
}

export interface DeleteAccountHandlerOptions {
  createService: (
    config: DeleteAccountServiceConfig,
  ) => DeleteAccountService;
  readEnv: (name: string) => string | null | undefined;
}

function readRequiredEnv(
  readEnv: DeleteAccountHandlerOptions["readEnv"],
  name: string,
) {
  return readEnv(name)?.trim() || null;
}

export function createDeleteAccountHandler(
  options: DeleteAccountHandlerOptions,
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
        DELETE_ACCOUNT_MAX_REQUEST_BYTES,
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
    const serviceRoleKey = readRequiredEnv(
      options.readEnv,
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return secureJsonResponse(
        { error: "Account deletion is not configured." },
        503,
        origin,
      );
    }

    let service: DeleteAccountService;
    try {
      service = options.createService({
        supabaseUrl,
        anonKey,
        serviceRoleKey,
        token,
      });
    } catch {
      return secureJsonResponse(
        { error: "Account deletion is temporarily unavailable." },
        503,
        origin,
      );
    }

    let userId: string | null;
    try {
      userId = await service.authenticate();
    } catch {
      return secureJsonResponse(
        { error: "Account authentication is temporarily unavailable." },
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
        DELETE_ACCOUNT_MAX_REQUEST_BYTES,
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

    if (body.confirmation !== "delete") {
      return secureJsonResponse(
        { error: "Deletion confirmation is required." },
        400,
        origin,
      );
    }

    let deleted = false;
    try {
      deleted = await service.deleteUser(userId);
    } catch {
      // The response deliberately does not distinguish database/admin errors.
    }
    if (!deleted) {
      return secureJsonResponse(
        { error: "Account deletion could not be completed." },
        502,
        origin,
      );
    }

    return secureJsonResponse({ deleted: true }, 200, origin);
  };
}
