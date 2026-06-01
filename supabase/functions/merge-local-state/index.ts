import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function getBearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

Deno.serve(async request => {
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

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;
  if (userError || !user) {
    return json({ error: "Invalid Supabase session." }, 401);
  }

  const body = await request.json().catch(() => null) as { snapshot?: Json } | null;
  const snapshot = body?.snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    return json({ error: "snapshot is required." }, 400);
  }

  const deviceId = typeof snapshot.deviceId === "string" ? snapshot.deviceId : crypto.randomUUID();
  const profile = snapshot.profile as Json | undefined;
  const readerPreferences = snapshot.readerPreferences as Json | undefined;
  const bookmarks = Array.isArray(snapshot.bookmarks) ? snapshot.bookmarks as Json[] : [];
  const vocabEntries = Array.isArray(snapshot.vocabEntries) ? snapshot.vocabEntries as Json[] : [];
  const learningProgress = Array.isArray(snapshot.learningProgress) ? snapshot.learningProgress as Json[] : [];
  const activityEvents = Array.isArray(snapshot.activityEvents) ? snapshot.activityEvents as Json[] : [];
  const readingProgress = snapshot.readingProgress && typeof snapshot.readingProgress === "object"
    ? snapshot.readingProgress as Record<string, number>
    : {};

  if (profile) {
    await supabase.from("profiles").upsert({
      user_id: user.id,
      onboarding: profile,
      client_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  if (readerPreferences) {
    await supabase.from("reader_preferences").upsert({
      user_id: user.id,
      script_mode: String(readerPreferences.scriptMode ?? readerPreferences.script_mode ?? "gurmukhi"),
      support_density: String(readerPreferences.supportDensity ?? readerPreferences.support_density ?? "guided"),
      meaning_language: String(readerPreferences.meaningLanguage ?? readerPreferences.meaning_language ?? "english"),
      payload: readerPreferences,
      client_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  for (const bookmark of bookmarks) {
    const readingId = String(bookmark.readingId ?? bookmark.verseId ?? bookmark.shabadId ?? bookmark.id ?? "");
    if (!readingId) continue;
    await supabase.from("bookmarks").upsert({
      id: String(bookmark.id ?? `${user.id}-${readingId}`),
      user_id: user.id,
      device_id: deviceId,
      reading_id: readingId,
      title: String(bookmark.title ?? "Saved passage"),
      source: String(bookmark.source ?? "NaamRas"),
      payload: bookmark,
      client_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,reading_id" });
  }

  for (const entry of vocabEntries) {
    const payload = entry.payload && typeof entry.payload === "object" ? entry.payload as Json : entry;
    const naturalKey = String(entry.naturalKey ?? entry.natural_key ?? payload.word ?? entry.id ?? "");
    if (!naturalKey) continue;
    const review = payload.review && typeof payload.review === "object" ? payload.review as Json : null;
    await supabase.from("vocab_entries").upsert({
      id: String(entry.id ?? `${user.id}-${naturalKey}`),
      user_id: user.id,
      device_id: String(entry.deviceId ?? entry.device_id ?? deviceId),
      natural_key: naturalKey,
      payload,
      review_due_at: typeof review?.nextReviewAt === "string" ? review.nextReviewAt : null,
      client_updated_at: String(entry.clientUpdatedAt ?? entry.client_updated_at ?? new Date().toISOString()),
      deleted_at: typeof entry.deletedAt === "string" ? entry.deletedAt : null,
    }, { onConflict: "user_id,natural_key" });
  }

  for (const [readingId, progress] of Object.entries(readingProgress)) {
    await supabase.from("reading_progress").upsert({
      id: `${user.id}-${readingId}`,
      user_id: user.id,
      device_id: deviceId,
      reading_id: readingId,
      progress,
      payload: { readingId, progress },
      client_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,reading_id" });
  }

  const acknowledgedEventIds: string[] = [];
  for (const event of activityEvents) {
    const eventId = String(event.id ?? "");
    if (!eventId) continue;
    acknowledgedEventIds.push(eventId);
    await supabase.from("activity_events").upsert({
      id: eventId,
      user_id: user.id,
      device_id: String(event.deviceId ?? event.device_id ?? deviceId),
      event_type: String(event.eventType ?? event.event_type ?? "client.event"),
      occurred_at: String(event.occurredAt ?? event.occurred_at ?? new Date().toISOString()),
      payload: event.payload && typeof event.payload === "object" ? event.payload : {},
      client_updated_at: String(event.clientUpdatedAt ?? event.client_updated_at ?? new Date().toISOString()),
      deleted_at: typeof event.deletedAt === "string" ? event.deletedAt : null,
    }, { onConflict: "id" });
  }

  await supabase.from("activity_events").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    device_id: deviceId,
    event_type: "sync.merge",
    occurred_at: new Date().toISOString(),
    payload: {
      bookmarks: bookmarks.length,
      vocabEntries: vocabEntries.length,
      learningProgress: learningProgress.length,
    },
  });

  return json({
    acknowledgedEventIds,
    mergedAt: new Date().toISOString(),
    snapshot: null,
    userId: user.id,
  });
});
