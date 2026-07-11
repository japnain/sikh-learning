import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function getBearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function readEnv(name: string) {
  return Deno.env.get(name)?.trim() || null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const token = getBearerToken(request);
  if (!token) {
    return json({ error: "Authorization bearer token is required." }, 401);
  }

  const body = await request.json().catch(() => null) as {
    confirmation?: unknown;
  } | null;
  if (body?.confirmation !== "delete") {
    return json({ error: "Deletion confirmation is required." }, 400);
  }

  const supabaseUrl = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Account deletion is not configured." }, 503);
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: userError } = await sessionClient.auth
    .getUser();
  const user = userResult?.user;
  if (userError || !user) {
    return json({ error: "Invalid Supabase session." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deletionError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );
  if (deletionError) {
    return json({ error: "Account deletion could not be completed." }, 502);
  }

  return json({ deleted: true });
});
