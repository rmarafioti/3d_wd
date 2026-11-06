# CLAUDE.md — Frontend

@docs/process.md

## Project Overview

The frontend codebase of our Headless CMS project. 3D Web Dev is the business; this CMS tool is called the Client Portal. The backend is in a separate repository which we connect to through the API contract in `docs/api.md`. This repo also serves a public, static landing page for SEO, separate from the two authenticated dashboards. Two roles to account for, an Administrator and a Site Owner, each have their own dashboard view.

- The Administrator (`/admin`) sees a summary of all site owner accounts and their websites (in the Accounts aside, present on every `/admin` route), creates new site owner accounts, links websites to existing accounts, and reads the audit log (`/admin/auditEvents`).
- The Site Owner (`/dashboard`) views, creates, edits, publishes, drafts and deletes posts and photo galleries for their own websites, adds Photo Galleries to a website, sends each ability's request form, and turns an ability on or off (the Abilities aside). The Administrator also sets an ability, and where its content goes, live.

Production: this app runs on Vercel at `https://3dwebdev.com`. The API runs on Render at `https://api.3dwebdev.com`. Both share the parent domain `3dwebdev.com`, so the backend's session cookie (`Domain=.3dwebdev.com`) is also visible to this app's `proxy.js`.

### Read before

Only `docs/process.md` loads every session. The reference docs are read when the work needs them, before planning, and only the sections the work needs: find the heading (`grep -n '^##' docs/flows.md`) and read those lines, not the whole file, since whatever is read is carried for the rest of the session.

| Before you…                                                                                  | Read              |
| -------------------------------------------------------------------------------------------- | ----------------- |
| change a page, a component, a dialog, a flow or a user-facing string                         | `docs/flows.md`   |
| add or change a call to the API, a request or response shape, an error message or validation | `docs/api.md`     |
| deploy, release, change env vars, domains or security headers                                | `docs/deploy.md`  |
| make a contract or flow change, add an enum value or an env var (classify it first)          | `docs/scaling.md` |

## Workflow Checklist

- Read the issue (`docs/process.md` → Issue Workflow)
- Branch from an up-to-date `main` (Issue Workflow step 3)
- Read the relevant spec (Project Overview → Read before), including `docs/scaling.md` for any change after the MVP
- Create a plan in plan mode (EnterPlanMode / ExitPlanMode), never as a chat message
- On approved, build
- Checks after building:
  - `npm test` green; new or changed logic has tests per Unit Tests
  - Test: verified in the browser, not just Postman
  - List every record the browser test created (accounts, websites, posts) so Rich can have the backend session delete them. Everything beyond the test baseline is cleared after testing, with its uploads in Cloudinary `3dwd-dev/`. The baseline is the admin, the test site owner `steviethedogchi@gmail.com` linked to Stevie The Dog, and its post "First Post!" (the backend's CLAUDE.md → Local database baseline is the source). Audit rows are never cleared after a test, locally or in production.
- Final step, always: self-review the diff. Read `.claude/skills/code-sweep/SKILL.md` and follow its `diff` mode (Code Review → Running a review), which checks `apiFetch`, the hook shape, the contract, the role gate, dialogs, styling and the rest of the Checklist. **Mandatory on every code update**: the first build, and every change after it, however small (a label, a colour, a fix from a finding). Run it before telling Rich the work is done or asking to commit, sweep for code the change made dead, and report the findings (or that there were none) in the same message. It is never skipped because the tests, lint and build pass.
- Only commit once code is reviewed, approved and all validation and tests are green, and only commit, push and open the PR once Rich says so (Issue Workflow step 6), and send him the PR's full URL. Rich merges it on GitHub
- After the merge (`docs/deploy.md` §8): staging builds `main` by itself; check it there, then Rich releases production with `npm run release` in the backend repo, backend first. This repo is never pushed to `staging` or `production` by hand

Step rhythm:

- Each issue follows `docs/process.md` → Issue Workflow; when it needs both repos, it ends with a cross-repo handoff (`docs/process.md` → Cross-Repo Handoff).
- Progress goes on the branch doing the work, written as the state after the merge: add an entry at the top of Current progress (date, branch and issue, such as `fix/x` (issue #42), since the PR number isn't known when it is committed; what was done, in one or two sentences, the PR holding the decisions and why), keep only the last five, moving the sixth to the top of `docs/history.md` → Progress, and update Now, Next and Pending notes to match. Merging the branch is what completes the step, so progress is never edited on `main` after a merge. Never open a branch only to mark something done: work that finishes outside this repo (the backend, a client website repo, Rich's account work) goes into the next branch here that has real work. Small "mark it done" branches pile up and are a waste.
- After a step is merged, Rich runs `/clear`, so the next step starts with only this file and `docs/process.md`: anything worth keeping must be written into this file or `docs/` before the clear.

## Plan Authoring

When in plan mode, write the plan to be legible cold — understandable by someone who never saw the conversation that produced it. State what's being built, which files will be touched, and why this approach was chosen. Avoid shorthand like "same pattern as before" or "as discussed" without spelling out what that actually means.

## Delegating to Subagents

Use subagents for research/exploration/investigation for a plan and for completing smaller tasks. Any search or read that spans many files goes to a subagent by default, so only its short summary enters this session's context; read a file directly when it is one you're about to edit.

## Role Ownership Check Rule

The backend enforces it on every request (backend `CLAUDE.md` → Role Ownership Check Rule): the account and website come from the session, never from client input. So the frontend never sends an account id, and never assumes it can see something just because it has an id.

## Anti-Patterns to Avoid

Lint enforces the rules marked **(lint)** (`eslint.config.mjs`, each message naming its rule here; `eslint.config.test.mjs` proves each fires). The prose says why.

**Never call `fetch` directly — always use `apiFetch()` (lint):**
`_lib/apiFetch.js` is the only place our API is fetched: it sets `credentials: 'include'` and the CSRF header on every write, unwraps `{ data }`, throws the `{ error }` envelope and handles 401 (its header, and `docs/api.md` → Conventions). Leaving off `credentials: 'include'` or the CSRF header fails silently or with a confusing 403 — that's why it lives in one place. The one other `fetch` is the image upload to Cloudinary in `_lib/uploadImages.js`, which goes to Cloudinary rather than our API, so it carries no credentials and no CSRF header, and its signature still comes from our API through `apiFetch`.

**Never send Sentry anything a user typed or sent (lint, for the imports and calls):**
Every event goes through `_lib/sentry.js`, the only file that imports Sentry, whose `dataCollection` and `scrubEvent` keep only the error and the page's path: no query string, cookies, headers, user or breadcrumbs. Never call `Sentry.setUser`, `setExtra` or `setContext` with user data, add breadcrumbs, or turn on tracing or Session Replay. Never report an `ApiError`: the UI shows it, and the backend reports its own 500s. The one event with tags is `reportUploadFailure`'s, for image uploads that failed after their retries: counts and failure reasons only, never a file, its name or the upload URL and fields. Sentry's SDK sends its events itself (its own `fetch` to the ingest origin, allowed in `connect-src` on production only); that is not a call to our API.

**Never store the session token, or try to read it, in JS at all (lint):**
No localStorage, no sessionStorage, no `document.cookie`, no attempt to inspect it. It's httpOnly by design specifically so JS can't touch it; any code that tries is fighting the architecture, not working with it. `proxy.js` only checks whether the `session` cookie _exists_ — it never decodes it.

**The landing page must never become a Client Component or pick up a client-side fetch (lint):**
That's the entire reason it's static — it defeats the SEO purpose the page exists for if it quietly turns dynamic. Small client islands inside the shared layout (like `AuthButton`) are fine as long as the page itself stays a static Server Component and nothing on it fetches.

**A page that renders user content or handles the session is never static:**
It must render per request so `proxy.js` can give it a nonce Content Security Policy. Only pages with no user content and no session are listed in `STATIC_PATHS` (`_lib/contentSecurityPolicy.js`) and get the fixed policy; every other page gets the nonce policy by default. A link from a static page to a session page is a plain `<a>` (a full page load), because a policy belongs to the document and a client-side route keeps the static page's. `style-src` keeps `'unsafe-inline'` (React, next/image and the Google button use `style="…"`); `script-src` on session pages never does.

**The reverse for the dashboards: never server-render per-user data:**
Next.js can render authenticated content in a Server Component, and if that's done carelessly there's a real risk of one user's data getting cached and served to a different user. Dashboards stay Client Components with client-side fetch, on purpose, not by default. Their route `layout.js` files are Server Components only to call `connection()` (per-request rendering for the nonce); they fetch and render no user data.

**The one-time key/secret reveal must never land in state that outlives the modal:**
Not Context, not a hook's cached data, not localStorage. Render it straight from the raw API response and let it fall out of memory once the modal closes; anything that persists it defeats the entire one-time-reveal design.

**Frontend form validation is UX only, never the actual gate:**
Don't build as if catching bad input client-side means the backend rejection path never needs handling — it will get hit (a duplicate email, a failed backend validation), and the UI needs to show that gracefully, not assume it can't happen.

**Trim input before checking truthiness:**
A field containing just a space is still a truthy, non-empty string — it'll slip past a naive `post.header ? ... : null` check and render as a blank-looking headline.

**Don't reach for Context unless more than one component actually needs the value:**
Local useState first — Context is for things like auth/role that genuinely span the app, not a default reach for anything async.

**New styling follows Rich's conventions, never a new visual direction:**
No CSS frameworks or UI component libraries. The approved exceptions are `react-icons`, for icons only, and `react-easy-crop`, for the gallery crop tool only. Never add another UI dependency without Rich's approval. Rich owns the look and reviews it in the browser. A new feature may be styled to match what is there, so it lands consistent and easy for him to tweak:

- CSS Modules in `_styling/`, imported as `styles`: extend the module that already styles that area, or add one module per new component (`componentName.module.css`). `globals.css` holds only element rules every page shares, plus two shared classes: `.fieldError` (a field's message) and `.dialogButtons` (two buttons side by side at the foot of a dialog, pushed to either end with `justify-content: space-between`; every dialog with a pair of buttons uses it). Cancel (or "Keep editing") is always the left button and the action the right one, in every dialog and in the Link panel.
- Classes only, never ids, with camelCase names that say what the element is (`statusRow`, `addButton`).
- Fonts only through the three variables in `globals.css`: `--logoFont`, `--headerFont` and `--copyFont` (`docs/flows.md` → App Shell, Fonts). No other font without Rich's approval.
- Form fields (`input`, `select`, `textarea`) keep a font size of at least 16px (`globals.css`), so iPhone Safari doesn't zoom on a tapped field; never lock the viewport (`maximum-scale=1`, `user-scalable=no`) to stop the zoom, since that also blocks pinch-zoom.
- Reuse the existing values: the purple `rgb(117, 99, 236)`, `lightgray` borders (and `rgb(230, 230, 230)` for a lighter line under a heading), `rem` spacing (0.2, 0.5, 1, 2), flexbox for layout, and the one phone breakpoint `@media (max-width: 667px)` at the end of the file.
- One rule per selector; group selectors only when they share declarations.
- A short comment on any rule whose reason isn't obvious.
- Never invent a new visual direction (new colours, fonts, shadows, animation). If a feature seems to need one, leave it plain and flag it for Rich.

The inline styles are functional: `white-space: pre-line` on post paragraphs in `dashboard/post/[id]/page.js` and `PostPreview.jsx`, and on a gallery's copy and its request note (Placement) in `dashboard/gallery/[id]/page.js` and its copy in `GalleryPreview.jsx`, which the API contract requires so typed line breaks show; `CropPreview`'s box proportions and image size and position, computed from each crop; and `AbilityInfo`'s box position and width, measured from its row on screen; neither of which a class can hold. They stay until Rich moves them.

## Out of Scope (do not build)

- Key/secret rotation. `CredentialRevealModal` is written so rotation can reuse it later, but there is no rotation UI in the MVP.
- UI to deactivate/reactivate accounts or websites.
- Drag-to-reorder body elements (they reorder with Move up / Move down).

## Patterns and Preferences

**Saving notes:**
When Rich asks to save or remember something, write it into the most fitting project md file (`CLAUDE.md`, a file in `docs/`, or `README.md`), not only into private memory, so it survives a context clear and is visible to everyone working on the repo. In plan mode, where only the plan file can be edited, put the doc edit in the plan.

**Data fetching goes through a per-resource custom hook in `_hooks/`, never inline fetch calls in components (lint, for importing `apiFetch`):**

One exception: signing in and out are one-shot auth actions, not data, so `SignInForm` (`POST /api/auth/login`) and `AuthButton` (`POST /api/auth/logout`) call `apiFetch` directly. They still go through `apiFetch`, never `fetch`.

Each hook's header comment says what it fetches and which mutations it exposes. The shared rules:

- `useApiResource(path)` holds the shared GET / ignore-stale / 401 / `refetch` logic behind the single-GET hooks; components never call it directly. A hook that must append pages (`useAuditEvents`, `useDeletedPosts`) has its own fetch.
- A hook that only mutates (`usePosts`, `useGalleries`, `useAbilities`) fetches nothing; its data comes with the list hook (`useWebsites`).
- Data shared by a layout and its pages is fetched once by the layout and read through Context (`useAdminData()`, `useSiteOwnerData()`).

Every data-fetching hook returns the same shape, plus whichever mutations are relevant to that resource: `{ data, loading, error }`. Without a library enforcing this automatically, consistency has to come from discipline — if one hook returns `{ posts, isLoading }` and another returns `{ data, error }`, every component consuming them needs to remember which shape it's dealing with. One shape, everywhere. Mutations return the API's `data` on success and throw the API error on failure. After a successful mutation, refetch the list it affects: list hooks also expose `refetch()` for this, and keep their current `data` while refetching so the list doesn't flash back to "Loading…".

**Role-gating happens once, at the layout level, not per page:**
The `/dashboard` and `/admin` layouts call `GET /api/auth/me`, fill AuthContext and redirect a wrong role to its own dashboard (`docs/flows.md` → App Shell, Dashboard layouts). This is UX only; the backend enforces access on every request.

**Session expiry (any 401):**
`apiFetch` handles every 401 the same way, a full page load to `/sign-in?expired=1`, except the login call's own 401, shown in the sign-in dialog (`docs/flows.md` → App Shell, Session expiry; Login).

**Every pop-up is a native `<dialog>`:**
For accessibility, every pop-up (signing in, errors, success messages, the Create / Edit forms, confirmations, the one-time reveal) uses a native `<dialog>` opened with `showModal()`. Clicking outside a dialog never closes it. Every dialog closes with the shared `DialogCloseButton`: an X in its top right corner, named "Close" for screen readers, that stays in view while the dialog scrolls, and Esc closes it (native behaviour). The exceptions:

| Dialog                                                                                               | X                                                | Esc                                       | Way out                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `CredentialRevealModal` (the one-time reveal)                                                        | none                                             | blocked, so credentials can't be lost     | its labelled Close button                                                    |
| `SubmitProgressDialog`                                                                               | none                                             | blocked: a step can't be stopped part way | none; the form unmounts it when Submit ends                                  |
| `AbilityRequestDialog`, first sent                                                                   | none                                             | blocked: the request form is required     | its Submit; the dashboard unmounts it once sent                              |
| `AbilityRequestDialog`, editing ("Edit placement")                                                   | none                                             | as Cancel                                 | Cancel (left) or Submit                                                      |
| `PostStepDialog` with a Cancel row (Create / Edit Post's and Gallery's steps, Add / Edit, the crops) | none, beside Cancel it reads as a second way out | routed to the parent's `onCancel`         | Cancel, which may ask "Are you sure…?" first; the dialog never closes itself |
| `ConfirmDialog`                                                                                      | none, so the user makes the choice               | as Cancel                                 | its confirm button or "Cancel" (its `cancelLabel`, such as "Keep editing")   |
| The sign-in dialog, while "Signing in…"                                                              | none until a login error shows                   | native                                    | it ends on its own                                                           |

Only the reveal, the progress dialog and the first request dialog block Esc (a two-line `cancel` handler); `PostStepDialog` handles `cancel` only to route Esc and the X to `onCancel`. A dialog without an X simply leaves `DialogCloseButton` out; there is no shared component for them, since they share nothing beyond `<dialog>` and `useModalDialog()`. `ConfirmDialog` and `PostStepDialog` share only the `.dialogButtons` row class. **Flag it to Rich when another dialog without an X comes up**: if those dialogs then share real behaviour (a button row, an Esc rule, styling), they move into one shared component then, not before.

**A success dialog only when the page doesn't already show the result:**
When a request succeeds and the page itself shows the result (a new post's row on `/dashboard`, an edited post on its page, a post leaving its table), the form simply closes, with no "has been created" / "updated" dialog to dismiss. A success dialog stays only when it tells the user something the page doesn't: the one-time credentials, or that an existing website's credentials were left unchanged (Create an Account, Link a Website). Removing a step that adds nothing is preferred over keeping it.

**Destructive actions are gated by a confirmation dialog:**
`ConfirmDialog` gates an action that can't be undone in one step: Delete Post and Delete Gallery (their pages and the dashboard's ⋮ menus), cancelling a post or gallery in its Create / Edit form once there is something to lose, removing Photo Galleries (its galleries are deleted with it), and the admin's Live switch (the app can't undo it). A post's status is not gated (the Published switch, or the ⋮ menu's status item): a draft is reversible, undone the same way, and the pill shows the result immediately. Neither are adding an ability or turning it on or off, each undone in one motion, nor restoring a deleted post (Recently Deleted), undone by deleting it again.

**The one-time key/secret reveal is a single reusable component:**
`CredentialRevealModal` is used by Create an Account and Link a Website now, and will be reused by key rotation later — one piece rather than recreating the "show once, discard on close" logic for each flow.

**Every on/off state is a single reusable `Toggle` switch:**
`Toggle` is used for a post's and a gallery's status (the Published switch, on the post and gallery pages and in Create a Post and Create a Gallery), the admin's Live switch (an ability's Turn On / Turn Off is a ⋮ menu choice in the Abilities aside), and is the control for every future on/off state (add-ons such as business hours, and turning an account or website on or off). It is a native `<button role="switch">` with `aria-checked`, named by its `label` for what "on" means ("Published"), with any visible heading for the setting ("Status") kept separate. Its optional `offLabel` / `onLabel` words ("draft" / "published") sit either side, hidden from screen readers. Its optional `statusColors` fills the track with `Pill`'s green (on) and red (off), for a switch that sets a status shown in a pill (a post's Published switch); other switches keep the grey track. It is always controlled by the saved value and never flips optimistically: the switch moves only once the request succeeds. A reversible on/off state saves in one motion with no confirmation.

**The website picker is a single reusable component:**
`WebsitePicker` is used by Create an Account and Link a Website.

**Create and Edit a Post are one flow, not two separate implementations:**
`PostForm` owns all of a post's state (its values, the step, the dialog open on top, the cancel gate, the upload and save), and every part under it is stateless about the post: `PostStepDialog` (the shared dialog: title, note, Cancel and its own button with no X, or the X alone on the review view; Esc and the X routed to `onCancel`), `PostToolbar` (the review view's rows, each with the shared `ActionsMenu`; `PostForm` passes its Published switch and Submit in as children), `PostPreview`, `ParagraphField` (its Bold / Italic / Link buttons, its links list with Edit / Delete, and the `LinkPanel`) and `ImageField` (its file picker, the jpg / png / webp and 10 MB check, and the picked file shown from an object URL until Submit uploads it) and `PublishDateField` (a draft's publish date, a day edited in place under the Status switch, converted by `_lib/publishAt.js`; the post and gallery pages show it through `PublishDateEditor`, which saves it on its own). Adding or editing one part works on a copy that only reaches the post on Insert / Save, and Insert waits for that element's own check, so the body is always valid (the limits and the Add / Delete rules: `docs/flows.md` → Post body dialogs). The post's own fields (labels, limits, help text, empty rows) and the elements' screen-reader names ("paragraph 2") come from `_lib/postFields.js`, so the dialogs and the toolbar read the same. Edit keeps each existing image's `id` so the backend can reconcile.

**Create and Edit a Gallery are one flow, built like the post flow:**
`GalleryForm` owns all of a gallery's state, as `PostForm` does a post's, and reuses its pieces where they fit: `PostStepDialog`, `ToolbarRow` (`PostToolbar`'s row, shared by `GalleryToolbar`), `ImageField`, `uploadPicked` (`_lib/uploadImages.js`, the upload both forms use), `ConfirmDialog`, `Toggle`, `CharacterCount`, `FieldLabel` and `PublishDateField`. Its own parts are stateless about the gallery: `GalleryToolbar`, `GalleryPreview`, `GalleryCropField` (the image dialog's Crops section, holding only which crop dialog is open), `CropDialog` (`react-easy-crop`), `MobileShapePicker` (shared by the first mobile crop's dialog and the "Edit mobile shape" dialog) and `CropPreview`. The two forms stay separate components: a post's body mixes paragraphs and images, a gallery's images carry captions and crops, and the shared logic already lives in the shared pieces. A gallery's name is checked against the website's other galleries (`takenGalleryNames`) before submit. A crop is kept in the pixels of the image the browser shows, and scaled to the stored size only on Submit (`_lib/crops.js`), so a crop is never re-scaled twice.

**Paragraph markup is read in one place (lint, for raw HTML):**
`_lib/postFormatting.js` reads the markup in `docs/api.md` → Paragraph formatting: `parseParagraph` for rendering and `findLinks` (a port of the backend's one-pass scan) for validation. `FormattedText` renders through it (the post page and the preview) and `_lib/validation.js` checks links through it. Nothing else reads the markup, and nothing ever sets raw HTML. Both scans read each character about once, so a long paragraph of unmatched `[` or `*` can't freeze the editor.

**The frontend always consumes camelCase from the API, never snake_case:**
The one exception is `UploadSignature.fields`, posted to Cloudinary unchanged and never read, renamed or rebuilt (`docs/api.md` → Conventions).

**Validation rules match the backend exactly:**
Use the limits in `docs/api.md` → Validation rules, through `_lib/validation.js` (`docs/scaling.md` §5). Show field messages from the API's `error.fields` next to the matching field when the backend rejects a submission.

**File naming:**
Components in PascalCase.jsx, hooks in camelCase.js prefixed with use, following standard React convention.

**In-line comments:**
Keep all code readable and explicit. Comments should be used to inform other developers of the logic in more abstract code. Make sure all comments have been validated and are truthful. Each JS / JSX file starts with a one- or two-line header comment on what it is for, with no history (issue numbers, dates, who decided): the PR holds decisions, and a reason a reader needs sits as an inline comment by the code it explains. CSS files need no header comment: a module is named for what it styles, and a rule whose reason isn't obvious gets its own comment.

## Code Style

Formatting is Prettier with default settings (`.prettierrc`), run before every commit (`npm run format`; CI checks it with `npm run format:check`), plus `npm run lint` clean. Prettier settles formatting; the rules below settle what Prettier can't.

- **File shape, top to bottom:** header comment (what the file is for) → `"use client"` if needed → imports (React, then Next, then local) → module constants (`UPPER_SNAKE`) → exported helpers → the main export. Inside a component: hooks and state → derived values → handlers → JSX.
- **Exports:** components and pages use `export default function Name`. Hooks, lib functions and component-adjacent helpers (`toWebsitePayload`, `postToFormValues`) are named exports.
- **Functions:** use function declarations for components, handlers and helpers. Use arrows only inline (callbacks, `.map`, `useCallback` bodies).
- **Naming:** functions that respond to a component-level event (submit, a dialog closing, a select change) are `handleX` (`handleSubmit`, `handleRevealClose`); a function named for the action it performs (`copyAll`, `deleteImage`, `changeStatus`) may be a plain verb. Callback props are `onX`. Booleans read as questions (`loading`, `copied`, `isBlank`). Use the vocabulary of `docs/flows.md` and `docs/api.md` (post, website, account, credentials), not synonyms.
- **Text input:** always `(value ?? "").trim()` before checking emptiness or length. Use the helpers in `_lib/validation.js` instead of re-writing the check inline.
- **Control flow:** early returns over nested `if`/`else`. No nested ternaries in JSX.
- **User-facing strings:** copy them word for word from `docs/flows.md` / `docs/api.md`. Never paraphrase a message the spec states.
- **No em dashes in user-facing text (lint, in strings and JSX text under `src/`).** Rich's preference: use a comma, a full stop or "!" instead. It applies to every frontend string and its copy in `docs/flows.md`.

## Unit Tests

Vitest + React Testing Library (jsdom). `npm test` runs the suite once, then the guard hook's `node:test` tests (`.claude/hooks/guard.test.js`, which Vitest leaves out: its `include` is `src/` and `eslint.config.test.mjs`); `npm run test:watch` runs Vitest while working. Tests are a gate, not decoration: a failing test blocks a commit the same as a failing build.

### When a test is justified

Write a test when the code carries a rule that someone could break without noticing:

- **A spec or contract rule:** anything `docs/api.md` or `docs/flows.md` states — validation limits and messages, request shapes, the CSRF header, the 401 redirect, payload building (blank → `null`, numbers as numbers, `id` only on existing items).
- **Branching logic:** a function or component that behaves differently by input or state (new vs existing website, published vs draft post, at vs under the image limit).
- **Shared code:** anything in `_lib/`, `_hooks/`, or a reusable component in `_components/` gets coverage, directly or through a flow test — one bug there breaks every caller.
- **A security or one-time rule:** credentials never kept in hook state, the reveal modal blocking Esc, credentials still revealed if a dialog closes mid-request.
- **A bug that was fixed:** write the failing test first, then fix the code, so it can't come back.
- **One layer is enough:** if a flow test already proves a behaviour through the real code (a page or form test running the real hook), don't repeat it in a unit test of the piece. Test the piece directly only for what the flow can't reach (edge states, stale responses, security rules).

Don't write a test for: static markup with no logic, styling, a constant (`roles.js`), a one-line pass-through (`useAuth`), or Next.js/React behaviour itself. A page made only of tested pieces needs a test only for the wiring it adds (e.g. the Published switch → status request → pill updates flow).

### The pattern every test follows

- **Location and naming:** the test sits next to the file it tests, `Name.test.jsx` / `name.test.js` (`page.test.jsx` next to a `page.js` is not a route). One `describe` per unit; each `it` reads as a behaviour sentence: `it("disables Submit until every required field is valid")`.
- **Arrange → Act → Assert,** separated by a blank line. One behaviour per test.
- **Test behaviour, not implementation:** render, interact the way a user would (`@testing-library/user-event`), and assert on what the user sees or what was sent to the API. Never assert on internal state or component internals.
- **Query by accessibility:** `getByRole`, `getByLabelText`, `getByText`, in that order of preference; scope with `within(...)` when a label appears twice. No `data-testid` and no CSS selectors.
- **Mock only the edges:**
  - The network, through `mockFetch` in `src/test/helpers.js`, so the real `apiFetch` runs. Forms are tested through their real hook where one exists (e.g. `CreateAccountForm` with `useAccounts`).
  - `next/navigation` (router spies, `useParams`) and third-party UI (`@react-oauth/google`'s button).
  - Browser APIs jsdom lacks or can't fake: `window.location` (`stubLocation`), image loading (`stubImageLoading`), object URLs (`stubObjectUrls`), Esc on a dialog (`pressEscape`). `<dialog>` itself is polyfilled in `src/test/setup.js`.
  - A component's own callback props may be `vi.fn()` spies — they are its interface. Nothing else in our own code is mocked.
- **Responses come from the contract:** mock bodies use the shapes and messages in `docs/api.md`, copied word for word, so a test fails if the code drifts from the contract.
- **Independent:** no shared mutable state between tests; mocks and stubbed globals reset after each test (`vitest.config.mjs`). Tests pass in any order and alone.
- **No snapshots.** They pass by default and nobody reads the diff.
- **Same rules as the rest of the code:** Code Style and Code Review apply to test files too — header comment, no dead tests, true test names.

## Code Review

A review is read-only. It produces findings; it never edits code. Once Rich has decided a sweep's findings, the fixes are folded into one issue that Claude drafts and opens on his yes, with anything big enough for its own plan split into its own issue (`/code-sweep` → After). Fixes are their own task: plan in plan mode, Rich approves, build, verify in the browser, PR. Every fix must preserve behaviour unless the finding is a bug.

### Checklist

These rules guide writing code as well as reviewing it. The `/code-sweep` skill holds the concrete check behind each item.

1. **Style is consistent.** The code matches Code Style. Two files doing one thing two ways take the documented way; if none is documented, the rule is written down before anything changes.
2. **No dead code.** Every import, variable, prop, export, file, branch, CSS class and hook return value has a use, and no code is commented out. Unused code is sometimes a missing wire-up, not junk. The best code is code that was never written.
3. **Explicit, then DRY.** Readability wins over cleverness. Extract into `_lib/`, `_hooks/` or `_components/` on the **third** copy, or the second where copies could drift (validation rules, dialog behaviour, fetch handling). Never for a case that doesn't exist yet; a shared piece must read more simply than the copies.
4. **Reads top to bottom as a story.** No helper far from its use without reason, no state declared far from where it's used. Names carry the meaning, so comments don't have to.
5. **Comments are necessary and true.** A misleading comment costs more than a missing one. Each says _why_, not _what_, carries no history, and every JS / JSX file's one- or two-line header matches what it does now.
6. **Docs match code.** `CLAUDE.md`, `docs/` and `README.md` describe what is in the repo, and the copies (`docs/api.md`'s API Contract, `docs/process.md`, the guard hook and its tests) are identical to the backend's, and `docs/scaling.md` still matches the backend rules it cites. Where the spec is right and the code differs, it's a bug.
7. **Architecture rules still hold.** The Role Ownership Check Rule, the Anti-Patterns and the Patterns and Preferences are true of the code.
8. **Every data view handles every state.** Loading, error (the API's `error.message`), empty ("No posts yet." etc.), and a backend rejection of a form that passed frontend validation.
9. **Tooling is clean.** `npm test`, `npm run lint` (with the Anti-Patterns' lint rules), `npm run format:check` and `npm run build` all pass (CI runs them, with the audit, on every PR).

### Running a review

The review's Scope, its Output format and the concrete check behind each Checklist item are the `/code-sweep` skill (`.claude/skills/code-sweep/SKILL.md`), their only copy, so every review runs the same way:

- **`/code-sweep diff`** is the self-review at the end of every piece of work (Workflow Checklist). Claude can't type a skill's command, so it reads the skill file and follows its `diff` mode.
- **`/code-sweep <commit>`** every 2 weeks, from the code sweep reminder (Reminders): the code changed since the last sweep, plus three checks over the whole repo (items 6, 7 and 9), which catch drift between files that a diff can't show.
- **`/code-sweep full`** once a quarter (the first sweep in January, April, July and October), and for the first sweep ever.

Each sweep ends with a row for Rich's Code Sweep Tracker sheet, kept outside the repo: repo (`frontend`), date, commit range, and the issues found. Its end commit is where the next sweep starts. Every few sweeps, an item that keeps producing findings is a sign this section needs tuning, and a change to it is proposed through a PR, so sweeps find fewer issues over time.

A change to the Checklist changes the skill in the same PR.

## Documentation Sync

The backend's docs are the source of truth, and the sync runs from the backend only (`/doc-sync`, backend `CLAUDE.md` → Documentation Sync). It reads this repo at `origin/main`, never edits it, and hands its findings here once Rich agrees; they are fixed on their own branch, through the usual plan → approval → PR.

- **Identical copies,** checked byte for byte by the backend's `npm run check:sync`: `docs/api.md` (the API Contract section of the backend's `docs/endpoints.md`), the guard hook and its tests, and `docs/process.md`. A change to any of them is made in the backend first, then copied.
- **Everything else** here points to backend rules rather than restating them, so the sync checks only the backend facts it states, that Features match the backend's one by one, and that Planned Later points to the backend's `later` issues.

## Reminders

This repo's reminders (`.github/workflows/reminders.yml`); how reminders work is in `docs/process.md` → Reminders.

| Reminder         | When                                                                   | What to do                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit | the 1st of every month, if anything found                              | the full `npm audit` (dev included) found a moderate or worse advisory: fix on a branch, or accept it with the reason in Current progress               |
| Code sweep       | every other Monday (even ISO weeks, the same Mondays as the backend's) | `/code-sweep <the end commit of the last frontend row in the tracker>`, or `full` once a quarter, then the tracker row (Code Review → Running a review) |

The restore drill and the Documentation Sync reminders are the backend's only.

## Tech Stack Summary

- Framework - Next.js (current stable, App Router) / JavaScript
- Auth - Google Identity Services via `@react-oauth/google`
- Fetch - custom hooks (useEffect / useState) on top of one shared `apiFetch()`
- State Handling - React Context (auth, and the admin data shared by the admin layout and page)
- Icons - react-icons
- Image cropping - react-easy-crop (gallery crops)
- Testing - Vitest + React Testing Library (jsdom)
- Error alerts - Sentry (`@sentry/browser`, production only, scrubbed)

## Project Architecture

```
root
├── .claude/
│   ├── hooks/guard.js            *the guard hook (`docs/process.md` → Version Control) and its tests, copied unchanged from the backend
│   ├── skills/code-sweep/        */code-sweep: the Code Review procedure, Scope and Output, run only when Rich types it
│   └── settings.json             *registers the guard hook; the deny and ask rules (`docs/process.md` → Version Control)
├── .github/
│   ├── reminders/                *open.sh (one reminder issue, never a duplicate) and the issue body templates
│   └── workflows/                *ci.yml (lint, format:check, audit, tests, build) and reminders.yml (Reminders)
├── src/
│   ├── proxy.js                  *Content Security Policy by page type; redirects signed-in users away from / and /sign-in
│   ├── instrumentation-client.js *starts Sentry before the app's own code (production only)
│   ├── test/                     *setup.js (jest-dom, <dialog> polyfill) and helpers.js (mockFetch, the only fake network)
│   └── app/
│       ├── _components/          *every component, one-time and reusable
│       ├── _context/             *AuthContext, AdminDataContext, SiteOwnerDataContext, NavContext
│       ├── _hooks/               *every hook (Patterns → Data fetching)
│       ├── _layout/              *Navbar, Footer, and the client DashboardLayout / AdminLayout the route layouts render
│       ├── _lib/
│       │   ├── apiFetch.js       *the only place our API is fetched
│       │   ├── contentSecurityPolicy.js *STATIC_PATHS and the nonce and static policies proxy.js sets
│       │   ├── uploadImages.js   *Submit's image uploads: each file shrunk, one signature, then each file to Cloudinary, 3 at a time, retried
│       │   ├── postFormatting.js *the one reader of paragraph markup
│       │   ├── sentry.js         *Sentry error reporting, production only, and the event scrub
│       │   └── validation.js     *frontend copy of the docs/api.md validation rules
│       ├── _styling/             *all module.css files
│       ├── sign-in/, dashboard/, admin/ *the routes; dashboard/ and admin/ each have a layout.js that renders per request and role-gates
│       ├── global-error.js       *a render error that reaches the root: reported to Sentry
│       ├── layout.js             *root layout (AuthProvider, Navbar, Footer)
│       └── page.js               *main landing page (static)
├── docs/                         *reference docs, read on demand (Read before); only process.md is imported
│   ├── flows.md                  *behavioral spec for every flow
│   ├── api.md                    *API contract (copy of backend docs/endpoints.md)
│   ├── scaling.md                *rules for changing the app after the MVP (frontend side)
│   ├── deploy.md                 *the frontend's side of deploying: Vercel, environments, domains, header checks
│   ├── process.md                *Issue Workflow, handoffs, Version Control, Releases: an identical copy of the backend's
│   └── history.md                *older progress entries, the launch checklist, the MVP Build Order, Features as recorded
├── .prettierignore               *leaves .claude/hooks/ to the backend's Prettier, so the copies stay identical
├── eslint.config.mjs             *Next.js's lint rules plus the Anti-Patterns' lint rules (eslint.config.test.mjs proves them)
├── next.config.mjs               *security headers, and the dev-only rewrite of /api/* to the local backend
├── vitest.config.mjs             *test config (jsdom, src/ tests and the lint config's test, mocks reset per test)
├── AGENTS.md                     *Next.js agent notes, written and re-added by `next dev`
└── .env.example, .prettierrc, jsconfig.json, README.md
```

\*underscore all folders that are excluded from routing. Every tested file has its `*.test.js(x)` next to it (see Unit Tests).

## Current progress (as of 2026-11-06)

- **Now:**
  - **Live since 2026-10-28:** the frontend at `https://3dwebdev.com` (Vercel Pro) and the API at `https://api.3dwebdev.com` (Render). Stevie The Dog is the first client website. Features 1 to 13 and issue #67 (with backend #71, placement apart from status) are live, the latest release `release-2026-11-03-3`.
  - **How work runs:** from a GitHub issue Rich writes (`docs/process.md` → Issue Workflow); breaking changes through expand → migrate → contract (`docs/scaling.md` §1, §3); a merge to `main` deploys staging, and Rich releases production with `npm run release` in the backend repo, backend first, each release tagged (`docs/process.md` → Releases).
  - **Staging** (`https://staging.3dwebdev.com`, `https://api-staging.3dwebdev.com`) is kept, following `main`.
  - **Audit cleanup done** (issue #69, with backend issue #73): the session docs trimmed, post `active` dropped, the process both repos follow in an identical `docs/process.md`, and #69's code items (issue #75): one `Pill`, and file headers of one or two lines with no history in any comment.
  - **V1 trim done** (issue #77, with backend issue #77): only `docs/process.md` loads every session, and the Anti-Patterns a linter can prove are lint rules.
  - **Scheduled publish** (issue #85, with backend issue #96) is merged once both PRs are: it goes out in one `npm run release`, backend first, since the frontend sends `publishAt` only to a backend that accepts it.
- **Next:**
  1. Stevie's galleries: Rich wires the gallery component into the Stevie The Dog site, which renders a gallery from `GET /api/public/galleries/:slug` (in its own repo, with its own handoff), then sets Photo Galleries live and its gallery live.
  2. Onboarding the four client websites waiting for launch.
- **Pending notes:**
  - Recently deleted posts: that a restored published post shows on the client website again (revalidation) is checked on production after the release, since the local Stevie The Dog site now uses the production API key.
  - Four client websites are waiting to onboard.
  - Staging is kept, following `main`, with the `production` branch beside it. Its cost ($13.30/month for Render staging) is reassessed later; if it is ever deleted, it is added back from production before the first breaking change (backend `docs/scaling.md` §8).
  - HSTS `preload`: not now. Revisit once email and any other service that may want its own subdomain are set up (`docs/deploy.md` §7).
  - Image library (reuse stored images) is a backend `later` issue (#86); the backend confirmed that image rows may share a `src` and that no save or cleanup deletes a file a row still uses.
  - Images: Cloudflare R2 is the fallback if Cloudinary's free tier is outgrown (backend `docs/setup.md` → Image Hosting). Every `<Image>` is unoptimized, so no `images.remotePatterns` entry is needed; if the preview moves to optimized `<Image>`, the Cloudinary host joins `images.remotePatterns`.
  - The test site owner Richard Marafioti (`steviethedogchi@gmail.com`) and the Stevie The Dog website exist, and signing in as that owner routes to `/dashboard`.
  - Wording still marked for Rich to confirm in the browser: the post and gallery cancel-gate buttons ("Yes, cancel post", "Discard changes", "Keep editing"), and the crop dialogs' notes (besides the two notes in `docs/flows.md`).
  - The Audit Events page and the Navbar's "Audit Events" link keep the base styling for now, for Rich to adjust later.
  - Landing page: only the opening block of the copy is live. The rest of the draft drawn from the master doc's Proposal - v1 tab (What I do, Who it's for, How we work together, the Client Portal) and a contact route wait for Rich, and its styling is plain for him to adjust.

The last five merged pieces of work, newest first (how they are kept: Workflow Checklist → Step rhythm).

- **2026-11-06** `feat/scheduled-publish` (issue #85; backend issue #96, the lead): a draft post or gallery gets a publish date (a day, published at its local midnight), set in the forms under the Status switch and on its own page with Set publish date / Clear; the dashboard tables gain a Live on column (`publishedAt ?? publishAt`) and turn on their side at phone width, with an Actions tap menu; Audit Events shows a scheduled publish as "Scheduled". Also: a sent posts placement is never asked for again, restoring a post goes back to `/dashboard`, the post page fits a phone, and "Your Websites" is gone. `docs/api.md` copies the backend's contract.
- **2026-11-05** `feat/recently-deleted-posts` (issue #83; backend issue #85, the lead): `/dashboard/deleted` lists the posts deleted in the last 30 days with their days left (from `restorableUntil`) and a Restore button, reached from a Navbar link, and Delete a Post's confirmation says the post can be restored for 30 days; Audit Events shows "Page N of M" beside Load more; each website's Posts heading gets a Placement row with the posts' placement pill, shown even with no posts; the Abilities aside moves into the dashboard layout, so it shows on every `/dashboard` route. `docs/api.md` copies the backend's contract (`DeletedPostSummary`, the list and restore routes, `pages`).
- **2026-11-05** `feat/ui-adjustments` (issue #81; backend issue #93): every pill is 1rem; the gallery table gets a Placement column with each gallery's placement pill, and the admin's gallery dropdown shows its Gallery Code (`placementTone` shared by the three placement pills); BBH Hegarty and Montserrat load through `next/font` as `--logoFont`, `--headerFont` and `--copyFont`; the landing page gets its first copy and meta description; the tables grow with their contents; the navbar reads "3D | WD" with semibold links; Audit Events gains a Date field for one local day (`from` / `to`); each ability in the Abilities aside gets an "i" saying what it does. `docs/api.md` copies the backend's contract. The backend clears the Posts placement once the last post is deleted, and generates new galleries' codes.
- **2026-11-05** `fix/upload-resilience` (issue #79, frontend only): Submit uploads new photos 3 at a time, retries one that fails on the network or with a 5xx twice (after 1s, then 3s), keeps every photo that uploaded when another fails so the next Submit uploads only the rest, says how many failed, and reports the failure to Sentry with counts and reasons only.
- **2026-11-04** `docs/v1-trim` (issue #77; backend issue #77, the lead): only `docs/process.md` is imported, with a Read before table in its place; `CLAUDE.md` is ordered by weight, each rule said once with no history inside it, and the launch checklist moves to `docs/history.md`. New ESLint rules (proven by `eslint.config.test.mjs`) enforce `apiFetch` only, no browser storage or cookie reads, no raw HTML, Sentry only through `_lib/sentry.js`, no em dash in UI text and a static landing page. Also records the Feature 11 phone-photo check as confirmed on production.

## Features

New work after the MVP Build Order, numbered and named the same as in the backend's CLAUDE.md, one branch → plan → approval → build → verify → PR each (backend `docs/scaling.md` §9). One line each: the rules in force are in `docs/flows.md` and `docs/api.md`, the decisions in each PR, and the Features as first recorded in `docs/history.md`.

1. **Post body as elements** (`feat/post-elements`): the post body as ordered paragraph and image elements.
2. **Admin Accounts aside** (`12-styling`, frontend only): the Accounts aside on every `/admin` route.
3. **Post preview v1** (`feat/post-preview`, frontend only): the post as it will read, beside the form.
4. **Post body formatting** (`feat/post-body-formatting`): bold, italic, bold-italic and links in a paragraph (`docs/api.md` → Paragraph formatting).
5. **Image uploads** (`feat/image-uploads`): images uploaded to 3DWD's Cloudinary on Submit, and the 20-hour form timeout.
6. **Admin audit log view** (`feat/admin-audit-log`, issue #38): `/admin/auditEvents`, one UTC month at a time.
7. **Delete a post** (`feat/delete-post`, issue #42): soft delete, and the dashboard's post table with its ⋮ menu.
8. **Post status** (`feat/post-status`, issue #44): `draft` / `published`; `active` dropped in #73 (`chore/drop-legacy-fields`).
9. **Streamlined post flow** (`feat/streamlined-post-flow`, issue #46, frontend only): step dialogs and a review view with a toolbar.
10. **Photo galleries** (`feat/photo-gallery`, issue #51): galleries of up to 30 images with optional, consistent crops.
11. **Faster photo submit** (`feat/faster-photo-submit`, issue #55, the frontend leads): photos shrunk before upload, the Submit progress dialog, 16px form fields.
12. **Abilities** (`feat/abilities`, issue #59): Posts and Photo Galleries as a website's abilities, the Abilities aside, the request dialog and the admin's Live switches; status split from placement by issue #67.
13. **Request emails** (`feat/ability-emails`, issue #63): a sent request message can be edited; the backend emails the admin.
14. **Recently deleted posts** (`feat/recently-deleted-posts`, issue #83): the site owner lists the posts deleted in the last 30 days and restores one; Audit Events counts its pages.
15. **Scheduled publish** (`feat/scheduled-publish`, issue #85): a draft post or gallery gets a publish date, and the backend's cron job publishes it when it passes.

## Planned Later

Ideas Rich has chosen for later are GitHub issues in the backend repo labelled `later` (`gh issue list -R rmarafioti/3d_wd_backend --label later`), each holding its backend and frontend detail. Not scheduled and not to be built yet: one becomes a numbered Feature (see Features) when Rich schedules it.
