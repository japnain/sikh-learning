# InsForge Setup For NaamRas

NaamRas keeps BaniDB as the canonical scripture source. InsForge is the user backend for:

- optional sign-in
- cloud sync for bookmarks, vocab, Learn saves, progress, and reader preferences
- edge functions such as `merge-local-state` and `generate-study-response`

## 1. Create Or Link A Project

```bash
npx @insforge/cli login
npx @insforge/cli create
npx @insforge/cli link
npx @insforge/cli current
```

This writes `.insforge/project.json`. Keep `.insforge/` out of git. `current` should show both a logged-in user and a linked project before you try to import the schema or deploy functions.

## 2. Import The NaamRas Schema

```bash
npx @insforge/cli db import ./insforge/schema/001_naamras_core.sql
```

The schema creates:

- `user_profiles`
- `saved_items`
- `vocab_entries`
- `learning_progress`
- `activity_events`

All user-owned tables include `user_id`, sync metadata, soft-delete support, and RLS rules keyed to `auth.uid()`. `user_profiles` is unique per `user_id`; the other durable tables dedupe by `(user_id, natural_key)` or `(user_id, scope)` as appropriate.

## 3. Configure Function Runtime Settings

Before deploying functions, set these runtime values in your InsForge project:

- `INSFORGE_AI_MODEL`
  Use the provider/model slug you have configured for InsForge AI.
- `INSFORGE_BASE_URL` (optional but recommended)
  Set this to your project URL if the function runtime should not infer it from the incoming request.

`merge-local-state` uses the caller's auth token and project database with RLS. `generate-study-response` requires both an authenticated user and a configured AI model.

## 4. Deploy Edge Functions

```bash
npx @insforge/cli functions deploy merge-local-state --file ./insforge/functions/merge-local-state.ts
npx @insforge/cli functions deploy generate-study-response --file ./insforge/functions/generate-study-response.ts
```

Both function files in this repo now contain real NaamRas logic:

- `merge-local-state`
  Authenticated guest-to-account merge, soft-delete handling, durable activity-event ingestion, and server-derived streak recomputation.
- `generate-study-response`
  Authenticated AI study responses with strict non-canonical guardrails and grounding limited to the scripture/context supplied by the app.

## 5. Configure The Frontend

Copy `.env.example` to `.env.local` and set at least:

```bash
VITE_INSFORGE_URL=https://your-app.your-region.insforge.app
```

Optional:

- `VITE_INSFORGE_ANON_KEY`
- `VITE_INSFORGE_FUNCTIONS_URL`
- `VITE_INSFORGE_MERGE_FUNCTION`
- `VITE_INSFORGE_STUDY_FUNCTION`
- `VITE_INSFORGE_ENABLE_STUDY_AI`
  Keep this `false` until the AI tools are reviewed and ready for product rollout.

## 6. Enable OAuth Providers

For the current NaamRas rollout, enable:

- Google
- Apple

The `More` page cloud-sync panel will stay local-only until the build has an InsForge URL and the auth providers are enabled.

## 7. Verify The Rollout

Use this sequence after deployment:

1. Open NaamRas as a guest and create bookmarks, Learn saves, or vocab items offline.
2. Sign in from the `More` page and confirm the first sync merges local state into the account.
3. Open the same account on a second device and confirm bookmarks, vocab, progress, and Nitnem state arrive without duplicates.
4. When `VITE_INSFORGE_ENABLE_STUDY_AI=true`, confirm AI study responses are clearly labeled as explanatory and non-canonical commentary.

## 8. Run The Backend Smoke Test

This repo includes a self-cleaning InsForge smoke test:

```bash
npm run insforge:smoke
```

It verifies:

- public auth config includes the expected providers
- a temporary user can sign up and sign in
- `merge-local-state` accepts a real user JWT
- synced rows land in all five NaamRas tables
- the temporary smoke-test user and rows are deleted afterward
