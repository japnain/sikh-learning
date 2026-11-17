import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';
import { PRIVATE_BOOK_BUCKET, type PrivateAsset, type PrivateBookMetadata } from './contract.ts';
import { createPrivateLibraryHandler } from './handler.ts';
import { authenticatePrivateLibrary } from './auth.ts';
import { writeOrderedPrivateState } from './state.ts';

const handler = createPrivateLibraryHandler({
  readEnv: name => Deno.env.get(name),
  createService: ({ supabaseUrl, anonKey, serviceRoleKey, token }) => {
    const session = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const backend = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    return {
      authenticate: () => authenticatePrivateLibrary(token, `${baseUrl}/auth/v1`, async token => {
        const { data, error } = await session.auth.getClaims(token);
        return { claims: data?.claims, error };
      }),
      authorize: async ({ userId, sessionId }) => {
        const { data, error } = await backend.rpc('authorize_private_library_request', {
          requested_user_id: userId, requested_session_id: sessionId,
        });
        if (error || !['allowed', 'denied', 'rate_limited'].includes(data)) throw new Error('Authorization unavailable.');
        return data as 'allowed' | 'denied' | 'rate_limited';
      },
      listBooks: async () => {
        const { data, error } = await backend.from('private_library_books').select('metadata')
          .eq('status', 'ready').order('sort_order').order('id').limit(501);
        if (error) throw new Error('Catalogue unavailable.');
        return (data ?? []).map(row => row.metadata as PrivateBookMetadata);
      },
      getBook: async bookId => {
        const { data, error } = await backend.from('private_library_books').select('metadata')
          .eq('id', bookId).eq('status', 'ready').maybeSingle();
        if (error) throw new Error('Book unavailable.');
        return data?.metadata as PrivateBookMetadata | null ?? null;
      },
      getAsset: async (bookId, assetId) => {
        const { data, error } = await backend.from('private_library_assets')
          .select('id,book_id,object_key,content_type,size,checksum').eq('id', assetId).eq('book_id', bookId).maybeSingle();
        if (error) throw new Error('Asset unavailable.');
        return data as PrivateAsset | null;
      },
      fetchAsset: async (asset, range, signal) => {
        const objectPath = asset.object_key.split('/').map(encodeURIComponent).join('/');
        return await fetch(`${baseUrl}/storage/v1/object/authenticated/${PRIVATE_BOOK_BUCKET}/${objectPath}`, {
          headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, ...(range ? { range } : {}) },
          signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
          redirect: 'error', cache: 'no-store',
        });
      },
      getState: async (userId, bookId, editionVersion) => {
        const { data, error } = await backend.from('private_library_state').select('state')
          .eq('user_id', userId).eq('book_id', bookId).eq('edition_version', editionVersion).maybeSingle();
        if (error) throw new Error('Reading state unavailable.');
        return data?.state as Record<string, unknown> | null ?? null;
      },
      putState: async (userId, bookId, editionVersion, state) => {
        await writeOrderedPrivateState(backend, userId, bookId, editionVersion, state);
      },
    };
  },
});

Deno.serve(handler);
