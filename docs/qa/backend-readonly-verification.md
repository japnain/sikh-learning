# Backend verification — 16 November 2026 (Toronto)

Read-only inspection of the connected NaamRas production project, against source baseline `1f1c042cacc507528f999f8072ed970f3d9bedbb`. No account, data, configuration or schema was changed.

- Exactly one connected project and no development branches were available. Two-account sandbox lifecycle, transaction smoke tests and backup restoration remain blocked; production is not a substitute test environment.
- Migration history includes all seven source stages, including `private_library_annotations` (`20261117022206`). A recorded migration alone does not prove every SQL statement is unchanged.
- `private-library` is ACTIVE at deployment version 4. All seven returned deployed TypeScript files match local source byte-for-byte, including auth, handler, contract, state, annotations and secure HTTP helper.
- All 14 public app tables have RLS enabled. All five private-library tables additionally force RLS and have zero client policies, as intended by the gateway-only design. Metadata confirms their privileges are granted to `service_role`, with no grants to `anon` or `authenticated`.
- The private authorization, read-state and write-state functions deny execute to `anon` and `authenticated`, and permit `service_role`. Gateway authentication and ownership enforcement still require synthetic integration proof.
- Security advisor's no-policy information matches this intentionally closed private-table design. Its separate compromised-password-protection warning remains open: [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Performance advisor reports an uncovered foreign key on private reading state and unused indexes. No indexes were changed based on unmeasured usage: [foreign-key guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). Health advisor returned no findings.

Remaining release evidence: controlled email recipients and two sandbox users; wrong-owner/anonymous request tests with database read-back; mixed-client annotation conflict and rollback tests; a sandbox backup restore, retention/quota confirmation, and physical-device auth flows. Do not interpret these metadata checks as successful end-to-end account testing.
