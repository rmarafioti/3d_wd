# Scaling

The frontend's rules for changing the app since launch. Read on demand (`CLAUDE.md` → Read before). The shared rules are in the backend's `docs/scaling.md`, the source of truth: launch (§0), classifying a change (§1), schema rules (§2), expand → migrate → contract (§3), API contract rules and the deploy order (§4), the new-feature template (§5), performance and pagination (§6), running more than one instance (§7), environments and staging (§8), and docs, tests and review (§9). This file holds only what the frontend does to follow them; "backend → N" means section N of the backend's `docs/scaling.md`.

## 1. Before planning

- State whether the change is **additive**, **breaking** or **data-changing** (backend → 1). The plan for a breaking change says so in its first lines.
- Every breaking or data-changing change goes through expand → migrate → contract (backend → 0, 3).

## 2. Reading responses and building requests

- **Ignore response fields you don't recognise.** The backend may add a field to any response at any time; that is not a breaking change. Never fail or warn on an extra field.
- **Build request bodies field by field**, as `toWebsitePayload` (`WebsitePicker.jsx`) and `toPayload` (`PostForm.jsx`) do. Never spread a response object back into a request, so a field the backend doesn't expect is never sent.
- **A new enum value** (for example a new role) is handled in the frontend before the backend starts returning it: `HOME_BY_ROLE` in `_lib/roles.js` and anything else that switches on it (backend → 2).

## 3. Contract changes, on this side

- The backend releases first (`npm run release` does it in that order, `docs/deploy.md` §8; backend → 4). `docs/api.md` is copied in the same piece of work (`docs/process.md` → Cross-Repo Handoff).
- The frontend never sends a field the deployed backend doesn't accept yet, and never relies on a response field the deployed backend doesn't send yet.
- In a breaking change, the frontend's step is the one where reads switch to the new shape. Before the backend removes anything, the frontend has stopped reading or sending it, and that frontend is released.

## 4. Error messages are contract

- A backend message is displayed exactly as `error.message` arrives through `apiFetch`.
- A frontend string that mirrors a backend message (such as "Your session expired, please sign in again.") is never reworded on its own. It changes only together with the backend.

## 5. Validation mirrors the backend

- A new or changed validation rule changes `_lib/validation.js` and the backend together.
- When the backend tightens a rule (a breaking change), the backend's rejection must still show as a field error from `error.fields` (`CLAUDE.md` → Code Review, item 8).

## 6. Pagination

- The shape is backend → 6. `GET /api/admin/auditEvents` is the first paginated endpoint: `apiFetch(path, { paginated: true })` returns `{ data, nextCursor, pages }` instead of `data` (`pages` null for a list that sends no count), and `useAuditEvents` appends each page ("Load more"). A later paginated list reuses both, as `useDeletedPosts` does.
- Adding pagination to an existing endpoint is a breaking change, so it arrives through a contract change and a handoff. Build paging into the hooks (`useApiResource` and its callers) only then, not ahead of time.

## 7. Environment variables

- A new `NEXT_PUBLIC_*` variable goes in `.env.example` (with a comment), the env table in `README.md`, and Vercel before the code that reads it is deployed. `NEXT_PUBLIC_*` values are inlined at build time, so changing one in Vercel needs a redeploy (`docs/deploy.md` §3).
