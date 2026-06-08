# issues

<!-- append-only log — bugs, blockers. A role isolation leak is a STOP-the-line incident: log it here immediately. -->

## ISSUE-01: RLS full isolation test requires mahara_app LOGIN in CI — Sprint 1
**Date**: 2026-06-08 | **Severity**: Medium | **Status**: Open → Sprint 1
**Context**: `withUserContext` sets `app.current_user` and `app.current_role` GUCs for RLS.
Full isolation test (talent A cannot read talent B's row) requires a NON-superuser DB connection
(the RLS policies are bypassed for superusers). CI currently uses `POSTGRES_USER=mahara_test`
which is a superuser. The `mahara_app` role in migrations is NOLOGIN.
**Fix for Sprint 1**: Add `POSTGRES_APP_USER/PASSWORD` to CI env and a `CREATE ROLE mahara_app
WITH LOGIN PASSWORD '...'` in `packages/db/init/00_roles.sql`. Set `TEST_APP_DB_URL` in CI.
Update the RLS integration test to use `TEST_APP_DB_URL` and assert `toHaveLength(0)`.

## ISSUE-03: Public profile page — users join blocked by RLS in production mahara_app context — Sprint 2
**Date**: 2026-06-08 | **Severity**: Low | **Status**: Open → Sprint 2
**Context**: `apps/web/src/app/[locale]/(public)/talent/[id]/page.tsx` uses `db.query.talentProfiles.findFirst({ with: { user: true } })`. This joins `users` table. When `db` connects as `mahara_app` (production), the `users_select` RLS policy blocks cross-user reads. In dev (superuser), it bypasses RLS.
**Options for Sprint 2**: (A) Add `users_select_public` policy for name+city (name and city are non-sensitive); (B) Denormalize name/city into talent_profiles; (C) Use two DB connections (owner for public reads, mahara_app for authenticated).
**Recommended**: Option A — add a permissive policy for name, city; accept that these two fields are public profile data.

## ISSUE-02: DrizzleAdapter TypeScript compatibility with custom user fields — Monitor Sprint 1
**Date**: 2026-06-08 | **Severity**: Low | **Status**: Needs `pnpm build` verification
**Context**: `@auth/drizzle-adapter` v1.7.4 types its table options. Our `users` table adds
custom columns (`role`, `passwordHash`, `city`, `phone`, `isActive`). TypeScript might flag
column type mismatch. The `role` field is returned from Google `profile()` — requires
`interface User { role?: Role }` augmentation in `next-auth.d.ts` (done).
**Fix**: If TS errors appear, cast the adapter tables or use `as unknown as AdapterUserTable`.
