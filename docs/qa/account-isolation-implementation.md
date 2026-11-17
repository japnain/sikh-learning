# SEC-01 account-owned local state

Base: `1f1c042cacc507528f999f8072ed970f3d9bedbb`. Implemented in the isolated audit-fix branch; no production writes or deployment.

## Behavior

- Existing unowned browser keys remain the separate local/guest space. Signing in never silently claims them. New account state uses an encoded owner namespace and a verified versioned ownership marker.
- Account-owned scope includes bookmarks, favorites, vocabulary, progress, reading places, stories, searches, routine/history/practice, cloud-covered preferences, activity events, export clocks/tombstones and restore recovery markers. Public downloads, device identity and appearance-only EPUB/artwork/audio preferences remain device-wide. This does not expand cloud coverage.
- The owner context changes synchronously before cloud user state changes; all registered stores clear outgoing memory and hydrate the incoming partition before the separate UI-observer phase. A regression proves an observer registered before a lazy store sees only completed incoming state. Invalid/unreadable data, failed marker writes or failed hydration disable uploads. The app subtree is keyed by the owner generation so previous-account sheet/draft state unmounts.
- Collection journals, generations and pending failed writes are owner-scoped. Same-owner storage events hydrate the current collection; foreign-owner events are ignored. Zustand pending session state is retained under its original owner, and conflicts with a changed durable baseline fail closed.
- Export/restore default to a captured Storage adapter; asynchronous owner changes cannot retarget disk writes. Restore tracks both owner and generation, uses a unique scoped recovery marker, and avoids restoring old mounted state after a switch.
- Cloud request generations still reject stale responses. Sync and account-deletion requests additionally pin the access token belonging to the captured identity; an SDK token refresh/account switch cannot authenticate A's captured payload as B.
- Sync validates persisted owned domains/metadata before exporting. Export metadata writes must succeed before any outbound request. No account ID, email, content or token is added to diagnostics.

## Explicit local import

More → Cloud backup offers **Import into this account** and **Keep separate** when eligible earlier local data exists. The source may be legacy/ambiguous, so copy asks the user to import only their own data. The existing strict backup merge performs the import; original local keys are never deleted. Metadata/tombstones from the ambiguous legacy account are not copied. Pending events merge by stable ID only after explicit choice.

A cross-tab Web Lock serializes a versioned owner-bound claim. Failed imports leave a pending claim that only that same account can retry. Successful/repeated imports are idempotent and cannot retarget another account. The retained source survives both local merge and cloud acknowledgement. Browsers without Web Locks fail this import safely; normal separate-account use still works, and backup-file controls remain available.

## Initial cloud merge

A fresh account namespace has no export metadata: profile/progress base revisions are null and saved-item/vocabulary tombstones are absent. The existing backend merge contract only replaces existing records when `excluded.base_updated_at IS NOT NULL`; fresh defaults therefore cannot overwrite an existing account's profile/progress. This is an ordinary merge that may insert absent defaults, not a claimed read-only pull. Existing `mergeContract.test.ts` asserts this SQL condition. Root separately verified the deployed v2 condition and v3 delegation read-only.

## Verification

- Original audit A→logout→B bookmark diagnostic now passes using real stores and mocked Auth/transport.
- Additional real-store tests cover all exported domains, retained clocks, return-to-A, direct auth changes, delayed A responses, bad ownership markers, unreadable incoming data, fresh null base revisions/no inherited tombstones, quota-failed bookmarks, metadata-write failure/no outbound request, signed-out reload, same-/different-owner storage events, explicit guest import, original-copy retention and no retargeting.
- Runtime tests retain partial-response rejection, queue acknowledgement, concurrent local edits, restoration recovery and lifecycle-generation checks. Their synthetic signed-in events/other-tab writes now use the account namespace rather than unowned guest keys. Tests assert pinned sync and delete credentials.
- Focused broad run: 243/243 tests across 13 files before the final added metadata regression; subsequent focused security/runtime/snapshot/collection/panel run passed 74/74; ordering/App/account run passed 59/59. These overlapping counts must not be added together. Typecheck and lint passed at that checkpoint.
- `scripts/qa/account-owner-acceptance.mjs`: root ran four passing Chromium journeys with real cross-tab Storage events and Web Locks, mounted collections, A→guest→B→A, reload and simultaneous idempotent local import. The fixture explicitly changes the local owner through dev modules; it does not claim a live Auth or backend test.
- Backup worker adds generation-aware restore race tests, owner-scoped session drafts/review state, Home/reader rollback fixes and mounted UI cleanup. Root adds route/sheet remount regression.

## Migration, recovery and rollback

No SQL migration or destructive local cleanup is needed. Old raw keys and per-owner partitions remain intact. A failure before/partway through hydration cannot enable upload; returning to the original account preserves its durable data. Backups export only the current account plus device appearance preferences. Export a backup before deleting an account; a retained partition cannot be reopened through the deleted identity. The deletion dialog now says this explicitly.

Rollback must retain the owner-storage adapter and fail-closed sync guard, or disable sync altogether. Reverting to the old shared-key automatic uploader would reopen SEC-01. Do not flatten account namespaces into raw keys, remove unknown data, erase a migration claim to import into a second account, or attempt to disentangle existing potentially mixed cloud data automatically.

## Remaining external proof

Two synthetic accounts against a dedicated sandbox database, server ownership read-back, lifecycle emails/deletion and physical iPhone/PWA behavior remain unverified because no sandbox/device was supplied. Mocked transport and local browser storage are not proof of deployed RLS or account lifecycle. Old clients in other tabs retain their old code until refreshed; do not treat client-only deployment as proof that every pre-upgrade client has stopped using shared legacy keys. The new partitions never automatically import those legacy keys.

### SDK logout limitation

Installed `@supabase/auth-js` source shows `signOut` waits for initialization and its internal lock, then obtains the session and calls logout before removing the local Auth session. The supported API does not offer an expected-user condition. Our post-response generation guard prevents stale logout UI updates, but a concurrently queued SDK signout affecting a later Auth session is not closed by a mock test. Verify that concurrency with real SDK-backed synthetic sessions in staging before claiming full lifecycle coverage. Do not infer this affects the token-pinned merge/account-deletion payloads: those are separately guarded and tested. No private SDK methods were patched.

### Independent-review follow-up

The reviewer reproduced a same-owner storage event overwriting a quota-failed session edit after A→B→A. Fixed `ownerStore` to preserve the pending memory version and the other tab's durable version, mark an owner-scoped recovery pause, invalidate in-flight sync, and block automatic persisted-store writes until explicit recovery. An unreadable outgoing baseline also retains the session state with an unknown baseline instead of dropping it. Permanent regressions are in `ownerStore.test.ts`; a real-store/runtime regression proves the conflicting versions remain distinct and no outbound request occurs. Recovery markers survive reload, while unsaved session-only edits still require the tab to stay open until recovered.

Final recovery hardening preserves malformed incoming partition bytes: failed preflight resets outgoing memory but skips incoming hydration, legacy migrations and pending-state replay. All normal fixed-owner and active storage adapters refuse owned-key writes/removals while recovery is pending, including writes triggered during remount. Validated backup restore alone obtains a fixed-owner privileged adapter. Its persisted-store hydration uses a synchronous owner-and-generation-bound write scope that closes before each await; owner changes cannot inherit that allowance. A successful explicit replacement hydrates the imported state before clearing recovery. A failed restore with successful rollback retains any pre-existing conflict marker and upload pause.

Final focused verification: 82/82 tests across `ownerStore`, `ownerStorage`, `auditAccountIsolation`, `runtime`, `personalDataBackup` and `personalDataBackupRecovery`, independently rerun by the reviewer with the same result. The tests cover protected adapter write/removal, retained malformed envelopes, failed recovery rollback, successful replacement hydration and migration side effects. Lint passed. Root owns the final clean-dependency full-suite/build and browser reruns; these focused results are not a substitute for the external proof listed above. Production and test code frozen after this run.
