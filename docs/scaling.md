# Scaling

The frontend's rules for changing the app after the MVP is deployed. Imported from `CLAUDE.md` via `@docs/scaling.md`. The shared rules live in the backend repo's `docs/scaling.md`, which is the source of truth for schema and migrations, the expand → migrate → contract process, API contract rules, the new-feature template, performance, running more than one instance, and environments and deployment. This file covers only what the frontend must do to follow them. It restates a backend rule only word for word, with its backend → N reference; references below read "backend → N", meaning section N of the backend's `docs/scaling.md`.

## 1. Classify the change first

- Before planning, state whether the change is **additive**, **breaking** or **data-changing**, using the backend's definitions (backend → 1).
- The plan for any breaking change says so in its first lines.

## 2. Reading responses and building requests

- **Ignore response fields you don't recognise.** The backend may add a field to any response at any time; that is not a breaking change. Never fail or warn on an extra field.
- **Build request bodies field by field**, as `toWebsitePayload` (`WebsitePicker.jsx`) and `toPayload` (`PostForm.jsx`) do. Never spread a response object back into a request, so a field the backend doesn't expect is never sent.
- **A new enum value** (for example a new role) is handled in the frontend before the backend starts returning it: `HOME_BY_ROLE` in `_lib/roles.js` and anything else that switches on it (backend → 2).

## 3. Deploy order for contract changes

- The backend deploys first and accepts both the old and the new shape; then the frontend deploys (backend → 4).
- The frontend never sends a field the deployed backend doesn't accept yet, and never relies on a response field the deployed backend doesn't send yet.
- A breaking change is split into steps (backend → 3). The frontend's part is the step where reads switch to the new shape and the frontend is updated.
- Before the backend removes anything (the contract step in backend → 3), the frontend has stopped reading or sending it and that frontend is deployed.

## 4. `docs/api.md` stays a copy

- `docs/api.md` stays identical to the API Contract section of the backend's `docs/endpoints.md`.
- It changes in the same piece of work as the backend, with a cross-repo handoff (`CLAUDE.md` → Cross-Repo Handoff).

## 5. Error messages are contract

- A backend message is displayed exactly as `error.message` arrives through `apiFetch`.
- A frontend string that mirrors a backend message (such as "Your session expired, please sign in again.") is never reworded on its own. It changes only together with the backend.

## 6. Validation mirrors the backend

- A new or changed validation rule changes `_lib/validation.js` and the backend together.
- When the backend tightens a rule (a breaking change), the backend's rejection must still show as a field error from `error.fields` (`CLAUDE.md` → Code Review, item 8).

## 7. Pagination

- No endpoint is paginated yet. The shape is defined in backend → 6: `?limit=&cursor=`, response `{ data: [...], nextCursor }`, `nextCursor` is `null` on the last page, default limit 50, max 100.
- The first candidates are the admin accounts list and the post summaries in the site owner websites list. (`GET /api/public/posts` is called only by client websites, never by the frontend; a breaking change to it goes to a new versioned path, backend → 4.)
- Adding pagination to an existing endpoint is a breaking change, so it arrives through a contract change and a handoff. Build paging into the hooks (`useApiResource` and its callers) only then, not ahead of time.

## 8. New features

Follow the backend's template (backend → 5). On the frontend side:

- Spec first: `docs/api.md`, and `docs/flows.md` for UI flows.
- The backend deploys first (section 3).
- Data goes through a new hook in `_hooks/` with the `{ data, loading, error }` shape.
- Every new data view handles loading, error, empty and backend-rejection states (`CLAUDE.md` → Code Review, item 8).
- Tests per `CLAUDE.md` → Unit Tests.

## 9. Environments

- A staging environment (a Railway service and a Vercel preview with its own database) is planned before the first breaking change (backend → 8).
- A new `NEXT_PUBLIC_*` variable goes in `.env.example` (with a comment), the env table in `README.md`, and Vercel before the code that reads it is deployed. `NEXT_PUBLIC_*` values are inlined at build time, so changing one in Vercel needs a redeploy.

## 10. Keeping this file in step

- A change to a backend rule this file depends on (deploy order, pagination shape, classification) updates this file in the same piece of work, with a handoff.
