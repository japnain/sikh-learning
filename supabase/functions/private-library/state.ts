import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

export function validStateTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

/**
 * A departing page can send its latest state while an older save is in flight.
 * Insert-only initialization and a conditional UPDATE make either arrival order
 * safe. PostgreSQL rechecks the timestamp predicate after any row-lock wait.
 * The timestamp is a client revision, never an authentication decision.
 */
export async function writeOrderedPrivateState(
  backend: SupabaseClient, userId: string, bookId: string, editionVersion: string,
  state: Record<string, unknown>,
): Promise<void> {
  if (!validStateTimestamp(state.updatedAt)) throw new Error('Invalid reading revision.');
  const row = {
    user_id: userId, book_id: bookId, edition_version: editionVersion,
    state, updated_at: new Date().toISOString(),
  };
  const { error: insertError } = await backend.from('private_library_state').upsert(row, {
    onConflict: 'user_id,book_id,edition_version', ignoreDuplicates: true,
  });
  if (insertError) throw new Error('Reading state unavailable.');
  const { error: updateError } = await backend.from('private_library_state').update(row)
    .eq('user_id', userId).eq('book_id', bookId).eq('edition_version', editionVersion)
    .or(`state->>updatedAt.is.null,state->>updatedAt.lt.${state.updatedAt}`);
  if (updateError) throw new Error('Reading state unavailable.');
}
