[README (1).md](https://github.com/user-attachments/files/30706105/README.1.md)
# checklist-yair# Restaurant Operations SaaS — Phase 1: Architecture & Folder Structure

Status: scaffold only. No database, no auth logic, no UI yet — those are
Phases 2–5. This phase exists to lock the architecture so nothing later
has to be rebuilt.

## Multi-tenancy model

Single Postgres database, tenant isolation via Row Level Security — not
separate databases or schemas per restaurant. This is the same model
Supabase-based multi-tenant SaaS products typically use, and it's what
makes "restaurant A can never see restaurant B's data" a database-level
guarantee instead of an application-level habit that one careless query
can break.

Two role layers, deliberately kept separate:

- **Platform role** (`profiles.role`): `super_admin` or `restaurant_user`.
  Exactly one `super_admin` row can exist — enforced by a partial unique
  index in Phase 2's migration, not just convention.
- **Restaurant role** (`restaurant_members.role`): `owner`, `manager`,
  `department_head`, `staff` — scoped per restaurant, so one auth user
  can hold different roles at different restaurants (e.g. a consultant
  managing two properties). This is why role isn't just a column on
  `profiles`.

## Why the Super Admin can't see operational data by construction

This isn't a UI choice ("just don't show the button") — it's structural:

- RLS policies on operational tables (checklists, checklist_items,
  images, remarks) only ever grant access via `restaurant_members`
  membership. `super_admin` is never a branch in those policies.
- The service-role client (`lib/supabase/admin.ts`) — the only thing in
  the codebase capable of bypassing RLS — is documented with an
  exhaustive list of the four platform-level operations it's allowed to
  perform, and none of them touch operational tables.
- The one exception (temporary support access) is modeled in Phase 2 as
  a restaurant-owner-created, time-limited grant that widens an RLS
  policy's condition for that restaurant only — never as a Super Admin
  override.

## Route structure

```
app/
  (auth)/              # /login, /register, /forgot-password — public
  (super-admin)/admin/  # Platform management, gated to super_admin in middleware
  (restaurant)/r/[restaurantSlug]/  # Tenant-scoped app, gated to restaurant_members
  api/                 # Route handlers for actions that need the service
                        # role (restaurant creation, subscription changes,
                        # support-access grants) — everything else talks
                        # to Supabase directly from Server Components/
                        # Server Actions under RLS.
```

Route groups `(auth)`, `(super-admin)`, `(restaurant)` don't affect the
URL — they exist purely to scope layouts and middleware logic per
section.

## Why RLS is the boundary and middleware isn't

`middleware.ts` only does two things: refresh the session cookie, and
redirect based on coarse role (logged out → `/login`, wrong role →
wrong section). It deliberately does NOT check "does this user belong to
restaurant slug X" — that's left to the RLS policies on the tables
themselves. The reason: middleware is a convenience layer that's easy to
accidentally skip when a new route is added later; the database is not.
If a route handler is ever written carelessly, RLS still holds.

## Storage

Supabase Storage buckets are tenant-scoped by path convention
(`{restaurant_id}/checklists/{checklist_id}/...`), with storage policies
mirroring the table RLS policies — built in Phase 2 alongside the schema
since the bucket policies depend on the same `restaurant_members` table.

## What's real vs. stubbed in this phase

Real, production-intent code:
- `middleware.ts` — full session refresh + role-gate logic
- `lib/supabase/client.ts`, `server.ts`, `admin.ts` — the three Supabase
  client boundaries, with the admin client's allowed-operations list
  documented inline
- `lib/constants/roles.ts` — the full role/permission matrix
- `tailwind.config.ts`, `next.config.mjs`, `tsconfig.json` — final, not
  placeholders

Intentionally stubbed, filled in later phases:
- `lib/types/database.ts` — generated from the schema in Phase 2, not
  hand-written
- No page has real content yet — Phases 4/5 build the actual dashboards
- No `.env.local` — you'll create your own Supabase project and fill in
  `.env.example`'s values before Phase 2's migrations can run

## Next: Phase 2

Database schema and SQL migrations — `restaurants`, `profiles`,
`restaurant_members`, `subscriptions`, `departments`, `checklists`,
`checklist_items`, `checklist_responses`, `support_access_grants`,
`audit_logs`, plus every RLS policy. This is the phase that makes the
privacy guarantee real, so it gets built carefully and reviewed before
Phase 3 (auth) starts wiring pages to it.
