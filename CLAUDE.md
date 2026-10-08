# CLAUDE.md — Frontend

@docs/flows.md
@docs/api.md
@docs/scaling.md

## Project Overview

The frontend codebase of our Headless CMS project. The backend is in a separate repository which we connect to through the API contract in `docs/api.md`. This repo also serves a public, static landing page for SEO, separate from the two authenticated dashboards. Two roles to account for, an Administrator and a Site Owner, each have their own dashboard view.

- The Administrator (`/admin`) sees a summary of all site owner accounts and their websites, creates new site owner accounts, and links websites to existing accounts.
- The Site Owner (`/dashboard`) views, creates, edits, archives and reactivates posts for their own websites.

Production: this app runs on Vercel at `https://3dwebdev.com`. The API runs on Railway at `https://api.3dwebdev.com`. Both share the parent domain `3dwebdev.com`, so the backend's session cookie (`Domain=.3dwebdev.com`) is also visible to this app's `proxy.js`.

## Tech Stack Summary

- Framework - Next.js (current stable, App Router) / JavaScript
- Auth - Google Identity Services via `@react-oauth/google`
- Fetch - custom hooks (useEffect / useState) on top of one shared `apiFetch()`
- State Handling - React Context (auth only)
- Testing - Vitest + React Testing Library (jsdom)

## Project Architecture

```
root
├── src/
│   ├── proxy.js                  *redirects signed-in users away from / and /sign-in
│   ├── test/
│   │   ├── setup.js              *jest-dom matchers, cleanup, <dialog> polyfill for jsdom
│   │   └── helpers.js            *mockFetch (the only fake network) and other browser-edge helpers
│   └── app/
│       ├── _components/          *all one-time and reusable components, e.g.
│       │                          AuthButton.jsx, WebsitePicker.jsx,
│       │                          CredentialRevealModal.jsx, PostBodyFields.jsx,
│       │                          LinkFields.jsx, ItemFields.jsx,
│       │                          ConfirmDialog.jsx, SignInForm.jsx,
│       │                          MessageDialog.jsx, CreateAccountForm.jsx,
│       │                          AccountList.jsx, LinkWebsiteDialog.jsx,
│       │                          SubmitErrors.jsx, PostForm.jsx, PostList.jsx
│       ├── _context/
│       │   └── AuthContext.jsx   *signed-in user, filled from GET /api/auth/me
│       ├── _hooks/               *all hooks used
│       ├── _layout/              *Navbar.jsx (holds AuthButton) and Footer.jsx
│       ├── _lib/
│       │   ├── apiFetch.js       *the only place fetch is called
│       │   ├── roles.js          *HOME_BY_ROLE: each role's dashboard route
│       │   └── validation.js     *frontend copy of the docs/api.md validation rules
│       ├── _styling/             *all module.css files
│       ├── sign-in/
│       │   └── page.js
│       ├── dashboard/
│       │   ├── layout.js         *calls /me, role-gates site owner routes
│       │   ├── page.js           *websites + post list, Create a Post
│       │   └── post/
│       │       └── [id]/
│       │           └── page.js   *single post, Edit, Archive / Make Active
│       ├── admin/
│       │   ├── layout.js         *calls /me, role-gates admin routes
│       │   └── page.js           *account list, Create an Account, Link a Website
│       ├── globals.css           *global styling
│       ├── layout.js             *root layout (AuthProvider, Navbar, Footer)
│       └── page.js               *main landing page (static)
├── docs/                         *reference docs, imported from CLAUDE.md
│   ├── flows.md                  *behavioral spec for every flow
│   ├── api.md                    *API contract (copy of backend docs/endpoints.md)
│   └── scaling.md                *rules for changing the app after the MVP (frontend side)
├── .env.example
├── .prettierrc
├── next.config.mjs               *dev-only rewrite of /api/* to the local backend
├── vitest.config.mjs             *test config (jsdom, setup file, mocks reset per test)
├── CLAUDE.md                     *project context, loaded automatically every session
└── README.md                     *human-facing overview and local setup
```

\*underscore all folders that are excluded from routing. Every tested file has its `*.test.js(x)` next to it (see Unit Tests).

## Build Order

The app is built in this order across both repos. Each step is built, tested and committed before the next starts. Check which repo a step touches — the other repo's side may need to exist first.

Each step is its own task: branch from an up-to-date `main`, write a fresh plan in plan mode (EnterPlanMode / ExitPlanMode), never as a chat message, get Rich's approval, build, verify, then commit and push and open a PR. Rich merges the PR on GitHub. When a step needs both repos, finish with a cross-repo handoff (see Cross-Repo Handoff). After a step is merged, Rich runs `/clear`, so the next step starts with only this file and `docs/` — anything worth keeping must be written here.

1. **Seed the administrator** — backend only.
2. **Login** — both. Frontend: `apiFetch`, AuthContext, sign-in page, Navbar/AuthButton, `/admin` and `/dashboard` layouts with placeholder pages, `proxy.js`, dev rewrite. Test by signing in as the admin and landing on `/admin`.
3. **Create an Account** — both. Admin account list, website picker, Create an Account form, one-time reveal. Test by creating the test site owner and the Stevie The Dog website (`https://www.steviethedog.com`) through the UI.
4. **Site owner login** — both (no new code expected). Sign in as the test site owner with a second Google account and confirm routing to `/dashboard`.
5. **Post CRUD** — both. Dashboard list, Create a Post, single post view, Edit a Post, Archive / Make Active.
6. **Link a Website** — both. Link a new and an existing website to an account from `/admin`.

**Progress:** steps 1–6 are done and merged (frontend step 3 in PR #3, step 5 in PR #5, step 6 in PR #6), so the MVP Build Order is complete. The code review (PR #7) is merged, and the frontend has a unit test suite (`npm test`). The rules for changing the app after the MVP are in `docs/scaling.md` (PR #9). Nothing is deployed to production yet, so `docs/scaling.md` applies from the first production deploy. The test site owner Richard Marafioti (`steviethedogchi@gmail.com`) and the Stevie The Dog website exist, and signing in as that owner routes to `/dashboard`. Update this line as each step merges. Feature 1, post body as ordered paragraph/image elements, is on branch `feat/post-elements` (backend branch of the same name): built, code-reviewed, review fixes applied, unit tests green, committed locally but **not pushed**. Remaining, in order:

1. Rich runs the full browser UI test against the local backend on `feat/post-elements`. The backend side is uncommitted and not yet tested in Postman.
2. With Rich's OK: push, open the PR, and change this line to the PR number.
3. Write the cross-repo handoff to the backend: the frontend is done, `docs/api.md` is identical to the backend's API Contract section, and the backend should commit and open its PR.

## Role Ownership Check Rule

Every read/write operation derives account/website from the session, never from client input, and verifies the requested resource belongs to it. This is enforced by the backend; the frontend never sends an account id and never assumes it can see something just because it has an id.

## Anti-Patterns to Avoid

**Never call `fetch` directly — always use `apiFetch()`:**
`_lib/apiFetch.js` is the only place `fetch` is called. It prefixes `NEXT_PUBLIC_API_BASE_URL`, always sets `credentials: 'include'`, sends JSON, adds `X-CSRF-Protection: 1` to every POST/PATCH/DELETE, unwraps `{ data }`, throws the `{ error }` envelope as an error the UI can display, and handles 401 (see Session Expiry). Leaving off `credentials: 'include'` or the CSRF header fails silently or with a confusing 403 — that's why it lives in one place.

**Never store the session token, or try to read it, in JS at all:**
No localStorage, no sessionStorage, no attempt to inspect it. It's httpOnly by design specifically so JS can't touch it; any code that tries is fighting the architecture, not working with it. `proxy.js` only checks whether the `session` cookie _exists_ — it never decodes it.

**The landing page must never become a Client Component or pick up a client-side fetch:**
That's the entire reason it's static — it defeats the SEO purpose the page exists for if it quietly turns dynamic. Small client islands inside the shared layout (like `AuthButton`) are fine as long as the page itself stays a static Server Component and nothing on it fetches.

**The reverse for the dashboards: never server-render per-user data:**
Next.js can render authenticated content in a Server Component, and if that's done carelessly there's a real risk of one user's data getting cached and served to a different user. Dashboards stay Client Components with client-side fetch, on purpose, not by default.

**The one-time key/secret reveal must never land in state that outlives the modal:**
Not Context, not a hook's cached data, not localStorage. Render it straight from the raw API response and let it fall out of memory once the modal closes; anything that persists it defeats the entire one-time-reveal design.

**Frontend form validation is UX only, never the actual gate:**
Don't build as if catching bad input client-side means the backend rejection path never needs handling — it will get hit (a duplicate email, a failed backend validation), and the UI needs to show that gracefully, not assume it can't happen.

**Trim input before checking truthiness:**
A field containing just a space is still a truthy, non-empty string — it'll slip past a naive `post.header ? ... : null` check and render as a blank-looking headline.

**Don't reach for Context unless more than one component actually needs the value:**
Local useState first — Context is for things like auth/role that genuinely span the app, not a default reach for anything async.

**Never make aesthetic styling decisions:**
No CSS frameworks, no component libraries, no color/font/spacing choices. Styling is owned entirely by Rich. The agent's only job with layout is basic structural formatting (flexbox only) to keep content readable within the viewport. If a component needs some layout to function at all, keep it minimal and unstyled beyond that. Don't add polish, don't guess at a visual direction.

## Patterns and Preferences

**Saving notes:**
When Rich asks to save or remember something, write it into the most fitting project md file (`CLAUDE.md`, a file in `docs/`, or `README.md`), not only into private memory, so it survives a context clear and is visible to everyone working on the repo. In plan mode, where only the plan file can be edited, put the doc edit in the plan.

**Data fetching goes through a per-resource custom hook in `_hooks/`, never inline fetch calls in components:**

- `useAuth()` \*reads AuthContext: `{ user, setUser }`
- `useRoleGate(role)` \*dashboard layouts: calls `/me`, fills AuthContext, redirects on role mismatch
- `useAccounts()` \*admin: all site owner accounts with their websites; also exposes `createAccount` and `linkWebsite`
- `useAllWebsites()` \*admin: every active website (powers the WebsitePicker)
- `useWebsites()` \*site owner: their own websites, each with post summaries
- `usePost(id)` \*site owner: a single post; also exposes `update` and `setStatus`
- `usePosts()` \*site owner: creation only (`create`)
- `useApiResource(path)` \*internal: the shared GET / ignore-stale / 401 / `refetch` logic behind `useAccounts`, `useAllWebsites`, `useWebsites` and `usePost`; never called by components directly
- `useModalDialog()` \*not a data hook: returns the ref for a `<dialog>` that opens with `showModal()` on mount

Every data-fetching hook returns the same shape, plus whichever mutations are relevant to that resource: `{ data, loading, error }`. Without a library enforcing this automatically, consistency has to come from discipline — if one hook returns `{ posts, isLoading }` and another returns `{ data, error }`, every component consuming them needs to remember which shape it's dealing with. One shape, everywhere. Mutations return the API's `data` on success and throw the API error on failure. After a successful mutation, refetch the list it affects: list hooks also expose `refetch()` for this, and keep their current `data` while refetching so the list doesn't flash back to "Loading…".

**Role-gating happens once, at the layout level, not per page:**
`/dashboard/layout.js` and `/admin/layout.js` each call `GET /api/auth/me` on load, put the user in AuthContext, and redirect if the role doesn't match — a site owner on `/admin` goes to `/dashboard`, an admin on `/dashboard` goes to `/admin`. This is UX only; the backend enforces access on every request.

**Session expiry (any 401):**
`apiFetch` handles a 401 the same way everywhere: clear AuthContext and redirect to `/sign-in?expired=1`; the sign-in page shows "Your session expired, please sign in again." Unsaved form data is lost. Exception: the login call itself — its 401 is "You are not authorized to log in." and is shown in the sign-in dialog instead.

**Every pop-up is a native `<dialog>`:**
For accessibility, every pop-up (signing in, errors, success messages, the Create/Edit Post forms, confirmations, the one-time reveal) uses a native `<dialog>` opened with `showModal()`. Every dialog has a visible Close button. Clicking outside a dialog never closes it. Esc closes ordinary dialogs (native behaviour); **only the one-time reveal blocks Esc** (handle the `cancel` event) so credentials can't be lost by an accidental keypress — it closes only with its Close button.

**Destructive actions are gated by a confirmation dialog:**
Archiving a post opens `ConfirmDialog` ("Are you sure you want to archive {postName}? It will be removed from your website.") before the request is sent. Make Active does not need a confirmation.

**The one-time key/secret reveal is a single reusable component:**
`CredentialRevealModal` is used by Create an Account and Link a Website now, and will be reused by key rotation later — one piece rather than recreating the "show once, discard on close" logic for each flow.

**The website picker is a single reusable component:**
`WebsitePicker` is used by Create an Account and Link a Website.

**The post body and link editors are shared between Create and Edit, not two separate implementations:**
`PostBodyFields` handles the body as an ordered array of paragraph and image elements: add, move up/down, delete, validation, the one-paragraph rule, the per-post limits (5 paragraphs, 5 images), and auto-filling image width/height. `LinkFields` handles the "add another" link list and its 10-link limit. Both use `ItemFields` for an item's labelled inputs. Create a Post and Edit a Post both use them; Edit additionally keeps each existing image's and link's `id` so the backend can reconcile.

**The frontend always consumes camelCase from the API, never snake_case:**
The database uses snake_case (`api_key_hash`), but Prisma's `@map` translates that to camelCase before it ever reaches a response. Frontend code should never need to think about the database's naming convention at all.

**Validation rules match the backend exactly:**
Use the limits in `docs/api.md` → Validation rules. Show field messages from the API's `error.fields` next to the matching field when the backend rejects a submission.

**File naming:**
Components in PascalCase.jsx, hooks in camelCase.js prefixed with use, following standard React convention.

**In-line comments:**
Keep all code readable and explicit. Comments should be used to inform other developers of the logic in more abstract code. Make sure all comments have been validated and are truthful. High level comments should be added at the top of each file to explain the file's purpose.

## Out of Scope (do not build)

- Key/secret rotation. `CredentialRevealModal` is written so rotation can reuse it later, but there is no rotation UI in the MVP.
- UI to deactivate/reactivate accounts or websites.
- Drag-to-reorder body elements or links (body elements reorder with Move up / Move down).

## Code Style

Formatting is Prettier with default settings (`.prettierrc`), run before every commit (`npm run format`), plus `npm run lint` clean. Prettier settles formatting; the rules below settle what Prettier can't.

- **File shape, top to bottom:** header comment (what the file is for) → `"use client"` if needed → imports (React, then Next, then local) → module constants (`UPPER_SNAKE`) → exported helpers → the main export. Inside a component: hooks and state → derived values → handlers → JSX.
- **Exports:** components and pages use `export default function Name`. Hooks, lib functions and component-adjacent helpers (`toWebsitePayload`, `postToFormValues`) are named exports.
- **Functions:** use function declarations for components, handlers and helpers. Use arrows only inline (callbacks, `.map`, `useCallback` bodies).
- **Naming:** functions that respond to a component-level event (submit, a dialog closing, a select change) are `handleX` (`handleSubmit`, `handleRevealClose`); a function named for the action it performs (`copyAll`, `deleteImage`, `changeStatus`) may be a plain verb. Callback props are `onX`. Booleans read as questions (`loading`, `copied`, `isBlank`). Use the vocabulary of `docs/flows.md` and `docs/api.md` (post, website, account, credentials), not synonyms.
- **Text input:** always `(value ?? "").trim()` before checking emptiness or length. Use the helpers in `_lib/validation.js` instead of re-writing the check inline.
- **Control flow:** early returns over nested `if`/`else`. No nested ternaries in JSX.
- **User-facing strings:** copy them word for word from `docs/flows.md` / `docs/api.md`. Never paraphrase a message the spec states.

## Code Review

A review is read-only. It produces findings; it never edits code. Fixes are their own task: plan in plan mode, Rich approves, build, verify in the browser, PR. Every fix must preserve behaviour unless the finding is a bug.

### Checklist

1. **Style is consistent.** The code matches Code Style above. If two files do the same thing two ways, pick the documented way. If no way is documented, raise it so the rule gets written down before anything is changed.
2. **No dead code.** Unused imports, variables, props, exports, files, unreachable branches, commented-out code, and hook return values no caller reads. For each one, decide: delete it, or find out why it isn't used. Unused code is sometimes a sign of a missing wire-up, not junk. The best code is code that was never written.
3. **Explicit, then DRY.** Readability wins over cleverness. But when the same logic appears a **third** time, or twice with a real risk of the copies drifting (validation rules, dialog behaviour, fetch handling), extract it into `_lib/`, `_hooks/` or `_components/`. Don't abstract for a case that doesn't exist yet. A shared piece must be simpler to read than the copies it replaces.
4. **Reads top to bottom as a story.** Each block builds on what came before it: no forward references to helpers defined far below without reason, and no state declared far from where it's used. A reader new to the file should be able to follow it in one pass. Names carry the meaning, so comments don't have to.
5. **Comments are necessary and true.** A misleading comment costs more than a missing one: it sends the next developer, or agent, chasing behaviour that isn't there. For every comment: is it still true of the code next to it? Does it explain _why_ rather than restate _what_? Delete it if not. Every file keeps its header comment, and the header must match what the file does now.
6. **Docs match code.** CLAUDE.md (architecture tree, hook list, Progress line), `docs/flows.md` and `README.md` describe what is actually in the repo. Fix whichever side is wrong; if the spec is right and the code differs, that's a bug finding.
7. **Architecture rules still hold.** Re-run the Anti-Patterns list and the Workflow Checklist "Checks after building" against the code: `apiFetch` only, the `{ data, loading, error }` hook shape, dialogs, no persisted credentials, the static landing page, client-side dashboards, no aesthetic styling.
8. **Every data view handles every state.** Loading, error (the API's `error.message`), empty ("No posts yet." etc.), and a backend rejection of a form that passed frontend validation.
9. **Tooling is clean.** `npm test`, `npm run lint`, `npm run format` (no diff) and `npm run build` all pass.

### Output

Return the findings as a list, most important first. Each finding has: the file and line, which checklist item it breaks, what's wrong, the proposed fix, and its type: **bug** (behaviour is wrong), **cleanup** (behaviour-neutral), or **doc** (docs or comments only). When a finding needs Rich to make a style or spec decision, mark it **decision** and don't propose a fix until he does.

### Scope

A full review covers every file under `src/`, plus `next.config.mjs`, CLAUDE.md, `docs/` and `README.md`. A per-step review (the self-review in Workflow Checklist) covers only that step's diff, plus anything the diff duplicates or makes dead elsewhere.

## Unit Tests

Vitest + React Testing Library (jsdom). `npm test` runs the suite once; `npm run test:watch` while working. Tests are a gate, not decoration: a failing test blocks a commit the same as a failing build.

### When a test is justified

Write a test when the code carries a rule that someone could break without noticing:

- **A spec or contract rule:** anything `docs/api.md` or `docs/flows.md` states — validation limits and messages, request shapes, the CSRF header, the 401 redirect, payload building (blank → `null`, numbers as numbers, `id` only on existing items).
- **Branching logic:** a function or component that behaves differently by input or state (new vs existing website, active vs archived post, at vs under the image limit).
- **Shared code:** anything in `_lib/`, `_hooks/`, or a reusable component in `_components/` gets coverage, directly or through a flow test — one bug there breaks every caller.
- **A security or one-time rule:** credentials never kept in hook state, the reveal modal blocking Esc, credentials still revealed if a dialog closes mid-request.
- **A bug that was fixed:** write the failing test first, then fix the code, so it can't come back.
- **One layer is enough:** if a flow test already proves a behaviour through the real code (a page or form test running the real hook), don't repeat it in a unit test of the piece. Test the piece directly only for what the flow can't reach (edge states, stale responses, security rules).

Don't write a test for: static markup with no logic, styling, a constant (`roles.js`), a one-line pass-through (`useAuth`), or Next.js/React behaviour itself. A page made only of tested pieces needs a test only for the wiring it adds (e.g. the archive confirm → status request → route to `/dashboard` flow).

### The pattern every test follows

- **Location and naming:** the test sits next to the file it tests, `Name.test.jsx` / `name.test.js` (`page.test.jsx` next to a `page.js` is not a route). One `describe` per unit; each `it` reads as a behaviour sentence: `it("disables Submit until every required field is valid")`.
- **Arrange → Act → Assert,** separated by a blank line. One behaviour per test.
- **Test behaviour, not implementation:** render, interact the way a user would (`@testing-library/user-event`), and assert on what the user sees or what was sent to the API. Never assert on internal state or component internals.
- **Query by accessibility:** `getByRole`, `getByLabelText`, `getByText`, in that order of preference; scope with `within(...)` when a label appears twice. No `data-testid` and no CSS selectors.
- **Mock only the edges:**
  - The network, through `mockFetch` in `src/test/helpers.js`, so the real `apiFetch` runs. Forms are tested through their real hook where one exists (e.g. `CreateAccountForm` with `useAccounts`).
  - `next/navigation` (router spies, `useParams`) and third-party UI (`@react-oauth/google`'s button).
  - Browser APIs jsdom lacks or can't fake: `window.location` (`stubLocation`), image loading (a stubbed `Image`), Esc on a dialog (`pressEscape`). `<dialog>` itself is polyfilled in `src/test/setup.js`.
  - A component's own callback props may be `vi.fn()` spies — they are its interface. Nothing else in our own code is mocked.
- **Responses come from the contract:** mock bodies use the shapes and messages in `docs/api.md`, copied word for word, so a test fails if the code drifts from the contract.
- **Independent:** no shared mutable state between tests; mocks and stubbed globals reset after each test (`vitest.config.mjs`). Tests pass in any order and alone.
- **No snapshots.** They pass by default and nobody reads the diff.
- **Same rules as the rest of the code:** Code Style and Code Review apply to test files too — header comment, no dead tests, true test names.

## Workflow Checklist

- Branch from an up-to-date `main`
- Check relevant spec (`docs/flows.md`, `docs/api.md`, and `docs/scaling.md` for any change after the MVP)
- Create a plan in plan mode (EnterPlanMode / ExitPlanMode), never as a chat message
- On approved, build
- Checks after building:
  - Every request goes through `apiFetch` (credentials and CSRF header handled there)
  - Hook returns consistent `{ data, loading, error }` shape
  - Requests and responses match `docs/api.md`
  - Role-gating redirect at layout level (UX only)
  - Every pop-up is a `<dialog>` with a Close button and no outside-click close
  - No aesthetic styling added
  - Test: verified in the browser, not just Postman
  - Self-review the diff against Code Review → Checklist
  - `npm test` green; new or changed logic has tests per Unit Tests
- Only commit once code is reviewed, approved and all validation and tests are green
- Commit, push and open a PR; Rich merges it on GitHub
- If the step touches both repos, write a cross-repo handoff (see below)

## Cross-Repo Handoff

Whenever a piece of work needs the frontend and backend to work in tandem (any Build Order step marked "both", or any change to `docs/api.md`), finish by writing a handoff message for Claude in the other repo. Rich pastes it into that repo's session, so it must be readable cold, with no context from this conversation.

Include:

- **What was completed here:** the step, the branch or PR, and whether it is tested and merged.
- **What this side now provides or expects:** the endpoints, request and response shapes, headers, cookies and env vars the other side relies on, and whether the API contract changed. If it did, `docs/api.md` must be updated in both repos.
- **Local dev wiring:** ports, proxy or rewrite setup, CORS, and any shared values (for example the Google Client ID).
- **Behaviour notes:** anything the other side must handle that isn't obvious from the contract.
- **What's next for them:** the next Build Order step or the remaining half of this one, and a "Done when" list of checks that prove it works end to end.

Remind the other side to follow its own workflow: read its docs, plan for Rich's approval, then build.

## Plan Authoring

When in plan mode, write the plan to be legible cold — understandable by someone who never saw the conversation that produced it. State what's being built, which files will be touched, and why this approach was chosen. Avoid shorthand like "same pattern as before" or "as discussed" without spelling out what that actually means.

## Delegating to Subagents

Use subagents for research/exploration/investigation for a plan and for completing smaller tasks.
