import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMergeLocalStateHandler } from "./handler.ts";

const handler = createMergeLocalStateHandler({
  readEnv: (name) => Deno.env.get(name),
  createService: ({ supabaseUrl, anonKey, token }) => {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return {
      authenticate: async () => {
        const { data, error } = await supabase.auth.getUser();
        return error ? null : data.user?.id ?? null;
      },
      mergeSnapshot: async (incomingRecords, incomingEvents) => {
        const { data, error } = await supabase.rpc(
          "merge_naamras_cloud_snapshot_v2",
          {
            incoming_records: incomingRecords,
            incoming_events: incomingEvents,
          },
        );
        return { data, failed: Boolean(error) };
      },
    };
  },
});

Deno.serve(handler);
