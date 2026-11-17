import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

export function validStateTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

export class PrivateStateWriteError extends Error {
  constructor(readonly code: 'capacity' | 'edition-changed' | 'invalid-state') {
    super('Reading state could not be saved.');
  }
}

/** Progress, per-note revisions and persistent tombstones commit atomically. */
export async function writeOrderedPrivateState(
  backend: SupabaseClient, userId: string, bookId: string, editionVersion: string,
  state: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!validStateTimestamp(state.updatedAt)) throw new Error('Invalid reading revision.');
  const { data, error } = await backend.rpc('write_private_library_state', {
    requested_user_id: userId, requested_book_id: bookId,
    requested_edition_version: editionVersion, requested_state: state,
  });
  if (error) {
    const reasons: Record<string, PrivateStateWriteError['code']> = { 'private-library-state-capacity': 'capacity',
      'private-library-edition-changed': 'edition-changed',
      'private-library-invalid-state': 'invalid-state' };
    const reason = reasons[error.message];
    if (reason) throw new PrivateStateWriteError(reason);
    throw new Error('Reading state unavailable.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Reading state unavailable.');
  return data as Record<string, unknown>;
}
