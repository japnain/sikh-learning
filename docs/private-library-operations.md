# Private library operations

The private collection uses Supabase Auth, database records and the private
`naamras-private-books` bucket. All browser access goes through `private-library`.
Being signed in or having an unrelated admin role does not grant access.

## Deploy the boundary first

1. Apply `supabase/schema/006_naamras_private_library.sql` after migrations 001–005.
   It creates four private tables, a service-only authorization function, a private
   bucket and restrictive storage policies. Do not grant client access to these tables.
2. Before seeding an owner, run `supabase/tests/private-library-session-smoke.sql`.
   Its synthetic accounts and sessions roll back; it refuses to run with an enabled
   real grant. Run `supabase/tests/private-library-access-smoke.sql` as well.
3. Deploy all files in `supabase/functions/private-library/` together with
   `supabase/functions/_shared/secure-http.ts`. Disable platform `verify_jwt` only
   for this function: the handler verifies the token using `getClaims`, checks its
   issuer/audience/role/expiry, and checks its live session and owner grant before
   accessing data. Disabling the platform check is not an anonymous-access mode.
4. Supply the standard server-only `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` environment variables. Never export the service key
   to Vite, browser code, build artifacts or logs.
5. Through trusted administration, identify the intended existing verified,
   non-anonymous, unbanned account and bind its UUID to the sole enabled
   `private_library_grants` row. The unique index permits only one enabled owner.
   Keep the account identifier outside committed files. Never grant by editable
   email/profile metadata or add a general-admin bypass.

## Stage and verify a batch

Run the private importer with an explicit manifest and output directory **outside
the repository**:

```sh
node scripts/library/import-private-books.mjs \
  --manifest /private/batch.json --out /private/staging
```

Do not use the public `library:import` command for private books. Review the
generated catalogue, asset manifest and import report. Resolve missing pages,
unsupported images, SVG geometry, auxiliary references and other fidelity
findings against the actual source. A PDF thumbnail depicts its first page,
which may not be its cover. Check every work's opening, ending, navigation,
poems, illustrations, tables and notes; validate metadata against the gateway
contract before uploading.

Map staged fields explicitly; never insert an entire local manifest object:

| Staged field | Database column |
|---|---|
| Book `id`, `metadata`, `status`, `sortOrder` | `private_library_books.id`, `metadata`, `status`, `sort_order` |
| Asset `id`, `bookId`, `objectKey`, `contentType`, `size`, `checksum` | `private_library_assets.id`, `book_id`, `object_key`, `content_type`, `size`, `checksum` |
| Asset `path` | Local upload input only; never store or return it |

Insert book records as `needs_review`, then their asset records. Use parameterized
database writes or correctly escaped structured JSON, not string interpolation of
titles or filenames. Upload immutable objects to their registered keys using
trusted service-side operations. Do not overwrite an existing key with different
bytes. Preserve the previous ready revision until the replacement is complete.

Independently verify the stored size **and SHA-256** of every original and derivative.
Confirm each cover, chapter, page and search reference resolves to an asset owned
by that book. A successful upload response or matching byte count alone is not
sufficient. Keep failures as `needs_review`; switch a work to `ready` only after
both byte verification and content review pass. Retain the private verification report.

Temporary upload provisioning, if required, stays outside this repository and
outside the permanent reader gateway. Limit it to exact staged assets, immutable
upload-only URLs and a short authorization lifetime. Close it after use. Supabase
signed upload URLs have a two-hour lifetime even if their issuing endpoint closes;
`upsert:false` prevents them from replacing an uploaded object. Never issue signed
read URLs for this collection.

## Verify and roll back

Run the private gateway tests, importer tests and relevant browser/reader tests,
then exercise the deployed API with an owner, an ordinary account and no session.
Replay an owner token after completed signout; test direct Storage/PostgREST paths,
HEAD and ranges. Inspect public build output for private metadata or files.

For immediate denial of new requests, disable the enabled private grant using
trusted administration. A frontend feature flag alone is insufficient. Restore
the prior gateway/catalogue revision if necessary; preserve private objects and
reading state for recovery. Do not make the bucket public to troubleshoot access.

The gateway checks live sessions and grants on each request. It cannot retract
bytes already delivered or necessarily stop an already-authorized stream. The app
clears private state on auth changes/denial and rechecks access on focus, visibility,
page restoration and a 60-second visible-page interval; idle views do not receive
instant push revocation. Session row existence detects signout, while project-wide
inactivity/single-session policies may take effect on token refresh. Keep those
limits explicit when evaluating stricter revocation requirements.
