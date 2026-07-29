import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDeleteAccountHandler } from "./handler.ts";

const handler = createDeleteAccountHandler({
  readEnv: (name) => Deno.env.get(name),
  createService: ({ supabaseUrl, anonKey, serviceRoleKey, token }) => {
    const sessionClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return {
      authenticate: async () => {
        const { data, error } = await sessionClient.auth.getUser();
        return error ? null : data.user?.id ?? null;
      },
      deleteUser: async (userId) => {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        return !error;
      },
    };
  },
});

Deno.serve(handler);
