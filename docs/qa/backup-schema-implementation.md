# ENG-01 — reader backup compatibility

Implemented from audited master `1f1c042cacc507528f999f8072ed970f3d9bedbb` on 16 November 2026 (Toronto). No deployment or backend migration.

## Change

`src/utils/epubReaderPreferences.ts` defines the shared version, defaults, types, field validation and supported migration. The store and personal-backup code use that contract. Version 1 retains its four original fields; version 2 retains all eight current fields. Earlier version-2 saves missing later additions receive defaults only for those absent fields. Invalid values and unexpected keys remain rejected by backup import; export reports unsupported/damaged optional preferences and does not modify the source storage.

Future-version envelopes are rejected on import and retained unchanged during store hydration. Export continues to provide the existing explicit omitted-preferences warning and writes defaults into the portable file for unsupported preferences; it leaves the original future envelope intact for recovery. Defaults, value ranges, cloud coverage, sacred text and saved reading positions are unchanged.

Backup exports/restores now use the captured owner-aware storage adapter from SEC-01. Restore validates the owner after asynchronous boundaries and between individual store hydrations. If the owner changes, rollback targets the captured partition and does not reapply the previous owner's mounted state into the new account.

## Verification

- Before change: the existing two backup regressions reproduced, with **49 passing / 2 failing** tests across backup and appearance files. Settings reset from 1.2 to 1 and from 2/spacious to 1/comfortable.
- After change: **92/92 tests pass** across backup, appearance, Nitnem draft and vocabulary queue tests under Node 22. Added coverage includes all eight nondefault fields through merge and replace, actual store hydration and re-export; both legacy versions; future-envelope retention/rejection; every malformed field; active-owner export; and owner changes during restore (including A→B→A with intervening edits).
- Existing malformed/prototype/size/rollback/reading-place tests remain included.
- Focused ESLint passed. TypeScript passed before the concurrent account adapter integration; final full gates are recorded in the aggregate implementation handoff.
- Browser runner: `QA_BASE_URL=http://127.0.0.1:4328 node scripts/qa/reader-backup-acceptance.mjs`. It uses a disposable guest context and real backup download/upload/replace controls, then refreshes, compares all eight persisted fields, compares rendered public-reader settings, and re-exports. Completed successfully at 390×844: all eight nondefault fields retained, public reader palette/line height/measure/font scale matched before and after, rendered font size remained 29.376px, and zero page errors or unexpected external requests. Evidence: `tmp/reader-backup-acceptance/report.json` and the root verification log.

## Preference scope (READ-02)

The stored envelope intentionally covers both public and private book readers. Public chapter reading currently consumes font scale, line height, measure and palette. Private reflowable text additionally consumes font family, paragraph spacing, reading mode and page-turn style. The extra fields survive use of the public reader and portable backup without claiming that public chapter reading supports private pagination/gestures. Bani and original/PDF presentation retain their separate format-specific controls. No speculative reader redesign was made.

## Migration and rollback

No SQL or content migration. Imports normalize supported envelopes to version 2 and retain the existing transactional restore. Do not revert only the backup contract to its old version-1-only validator: that would reintroduce preference loss. Older reader code needs the compatible reader or preservation of the v2 envelope. Account partition rollback follows SEC-01's forward-fix/fail-closed requirements; never copy another account's partition into the legacy local space.

Authenticated private-rendering, live account/backend lifecycle and physical-iPhone/PWA behaviour remain separate verification requirements; this patch does not claim those passed.

## Account-boundary review follow-up

Additional review found and fixed direct raw-storage rollback in `Home` and `ReaderFinishPanel`, account-unscoped session Nitnem drafts and vocabulary review queues, and delayed public-reader saves during account-change unmounts. Public chapter, Story, Rehat and Study callbacks now compare their mounted owner generation before writing. Rehat, Story and public-chapter regressions prove outgoing cleanup does not save into the incoming owner. The focused public-reader/owner set passed **82/82**, with **159/159** in a broader run including Study continuous-reader/practice behaviour (overlapping sets, not additive).

An unreadable incoming account partition now resets outgoing memory without running incoming hydration/migrations. Tests assert malformed/unsupported incoming bytes remain unchanged. Recovery API integration separates a genuinely completed explicit restore from a safe rollback: an unsuccessful restore cannot clear an existing recovery requirement. When ownership changes and touched storage has intervening writes, restore preserves those newer bytes and reports recovery required rather than overwriting them or claiming rollback succeeded.

Final recovery integration verification: **86/86 tests pass across four files** (`personalDataBackup`, `epubReader`, `ownerStore`, `auditAccountIsolation`), overlapping previous counts. A real-runtime restore fixture proves the current-session migration writes the restored reading place durably while sync is paused. The narrowly scoped synchronous write allowance closes before every await and cannot retarget another owner/generation. Focused ESLint and TypeScript build pass on the integrated code.
