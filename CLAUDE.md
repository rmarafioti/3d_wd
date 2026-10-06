# CLAUDE.md — Frontend

@docs/flows.md
@docs/api.md

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

## Project Architecture

```
root
├── src/
│   ├── proxy.js                  *redirects signed-in users away from / and /sign-in
│   └── app/
│       ├── _components/          *all one-time and reusable components, e.g.
│       │                          AuthButton.jsx, WebsitePicker.jsx,
│       │                          CredentialRevealModal.jsx, ImageLinkFields.jsx,
│       │                          ConfirmDialog.jsx, SignInForm.jsx
│       ├── _context/
│       │   └── AuthContext.jsx   *signed-in user, filled from GET /api/auth/me
│       ├── _hooks/               *all hooks used
│       ├── _layout/              *Navbar.jsx (holds AuthButton) and Footer.jsx
│       ├── _lib/
│       │   └── apiFetch.js       *the only place fetch is called
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
│   └── api.md                    *API contract (copy of backend docs/endpoints.md)
├── .env.example
├── .prettierrc
├── next.config.mjs               *dev-only rewrite of /api/* to the local backend
├── CLAUDE.md                     *project context, loaded automatically every session
└── README.md                     *human-facing overview and local setup
```

\*underscore all folders that are excluded from routing

## Build Order

The app is built in this order across both repos. Each step is built, tested and committed before the next starts. Check which repo a step touches — the other repo's side may need to exist first.

1. **Seed the administrator** — backend only.
2. **Login** — both. Frontend: `apiFetch`, AuthContext, sign-in page, Navbar/AuthButton, `/admin` and `/dashboard` layouts with placeholder pages, `proxy.js`, dev rewrite. Test by signing in as the admin and landing on `/admin`.
3. **Create an Account** — both. Admin account list, website picker, Create an Account form, one-time reveal. Test by creating the test site owner and the Stevie The Dog website (`https://www.steviethedog.com`) through the UI.
4. **Site owner login** — both (no new code expected). Sign in as the test site owner with a second Google account and confirm routing to `/dashboard`.
5. **Post CRUD** — both. Dashboard list, Create a Post, single post view, Edit a Post, Archive / Make Active.
6. **Link a Website** — both. Link a new and an existing website to an account from `/admin`.

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

**Data fetching goes through a per-resource custom hook in `_hooks/`, never inline fetch calls in components:**

- `useAuth()` \*reads AuthContext: `{ user, setUser }`
- `useRoleGate(role)` \*dashboard layouts: calls `/me`, fills AuthContext, redirects on role mismatch
- `useAccounts()` \*admin: all site owner accounts with their websites; also exposes `createAccount` and `linkWebsite`
- `useAllWebsites()` \*admin: every active website (powers the WebsitePicker)
- `useWebsites()` \*site owner: their own websites, each with post summaries
- `usePost(id)` \*site owner: a single post; also exposes `update` and `setStatus`
- `usePosts()` \*site owner: creation only (`create`)

Every data-fetching hook returns the same shape, plus whichever mutations are relevant to that resource: `{ data, loading, error }`. Without a library enforcing this automatically, consistency has to come from discipline — if one hook returns `{ posts, isLoading }` and another returns `{ data, error }`, every component consuming them needs to remember which shape it's dealing with. One shape, everywhere. Mutations return the API's `data` on success and throw the API error on failure. After a successful mutation, refetch the list it affects.

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

**The multi-item form pattern (image/link "add another") is shared between Create and Edit, not two separate implementations:**
`ImageLinkFields` handles the array of images and links, add/remove, validation, the per-post limits (5 images, 10 links), and auto-filling image width/height. Both Create a Post and Edit a Post use it; Edit additionally keeps each existing item's `id` so the backend can reconcile.

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
- Drag-to-reorder images or links.

## Style Guidelines

Formatting via `.prettierrc`, run before commit.

## Workflow Checklist

- Check relevant spec
- Create a plan
- On approved, build
- Checks after building:
  - Every request goes through `apiFetch` (credentials and CSRF header handled there)
  - Hook returns consistent `{ data, loading, error }` shape
  - Requests and responses match `docs/api.md`
  - Role-gating redirect at layout level (UX only)
  - Every pop-up is a `<dialog>` with a Close button and no outside-click close
  - No aesthetic styling added
  - Test: verified in the browser, not just Postman
- Only commit once code is reviewed, approved and all validation and tests are green

## Plan Authoring

When in plan mode, write the plan to be legible cold — understandable by someone who never saw the conversation that produced it. State what's being built, which files will be touched, and why this approach was chosen. Avoid shorthand like "same pattern as before" or "as discussed" without spelling out what that actually means.

## Delegating to Subagents

Use subagents for research/exploration/investigation for a plan and for completing smaller tasks.
