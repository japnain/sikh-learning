import type { PrivateLibraryIdentity } from './handler.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type VerifiedClaimsResult = { claims: unknown; error?: unknown };

/** The supplied verifier must cryptographically validate the JWT, not decode it. */
export async function authenticatePrivateLibrary(
  token: string,
  expectedIssuer: string,
  verifyClaims: (token: string) => Promise<VerifiedClaimsResult>,
  nowSeconds = Date.now() / 1000,
): Promise<PrivateLibraryIdentity | null> {
  const result = await verifyClaims(token);
  if (result.error || !result.claims || typeof result.claims !== 'object' || Array.isArray(result.claims)) return null;
  const claims = result.claims as Record<string, unknown>;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== expectedIssuer || !audience.includes('authenticated')
    || claims.role !== 'authenticated' || typeof claims.sub !== 'string' || !UUID.test(claims.sub)
    || typeof claims.session_id !== 'string' || !UUID.test(claims.session_id)
    || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= nowSeconds
    || (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > nowSeconds))) return null;
  return { userId: claims.sub, sessionId: claims.session_id };
}
