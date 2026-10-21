# CLAUDE.md — Frontend

@docs/flows.md
@docs/api.md
@docs/scaling.md

## Project Overview

The frontend codebase of our Headless CMS project. 3D Web Dev is the business; this CMS tool is called the Client Portal. The backend is in a separate repository which we connect to through the API contract in `docs/api.md`. This repo also serves a public, static landing page for SEO, separate from the two authenticated dashboards. Two roles to account for, an Administrator and a Site Owner, each have their own dashboard view.

- The Administrator (`/admin`) sees a summary of all site owner accounts and their websites (in the Accounts aside, present on every `/admin` route), creates new site owner accounts, and links websites to existing accounts.
- The Site Owner (`/dashboard`) views, creates, edits, archives and reactivates posts for their own websites.

Production: this app runs on Vercel at `https://3dwebdev.com`. The API runs on Railway at `https://api.3dwebdev.com`. Both share the parent domain `3dwebdev.com`, so the backend's session cookie (`Domain=.3dwebdev.com`) is also visible to this app's `proxy.js`.

## Tech Stack Summary

- Framework - Next.js (current stable, App Router) / JavaScript
- Auth - Google Identity Services via `@react-oauth/google`
- Fetch - custom hooks (useEffect / useState) on top of one shared `apiFetch()`
- State Handling - React Context (auth, and the admin data shared by the admin layout and page)
- Icons - react-icons
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
│       │                          AuthButton.jsx, DashboardTitle.jsx, WebsitePicker.jsx,
│       │                          CredentialRevealModal.jsx, PostBodyFields.jsx,
│       │                          ImageField.jsx, FormattedText.jsx,
│       │                          ConfirmDialog.jsx, DialogCloseButton.jsx, SignInForm.jsx,
│       │                          MessageDialog.jsx, CreateAccountForm.jsx,
│       │                          AccountList.jsx, AccountsAside.jsx, LinkWebsiteDialog.jsx,
│       │                          SubmitErrors.jsx, PostForm.jsx, PostList.jsx, Toggle.jsx,
│       │                          StatusPill.jsx, PostPreview.jsx, ParagraphField.jsx,
│       │                          LinkPanel.jsx
│       ├── _context/
│       │   ├── AuthContext.jsx   *signed-in user, filled from GET /api/auth/me
│       │   └── AdminDataContext.jsx *admin accounts + websites, shared by the admin layout and page
│       ├── _hooks/               *all hooks used
│       ├── _layout/              *Navbar.jsx (holds DashboardTitle and AuthButton) and Footer.jsx
│       ├── _lib/
│       │   ├── apiFetch.js       *the only place our API is fetched
│       │   ├── uploadImages.js   *Publish's image uploads: one signature, then each file to Cloudinary
│       │   ├── postFormatting.js *the one reader of paragraph markup: parseParagraph and findLinks
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
│       │           └── page.js   *single post, Edit, Active switch (Archive / Make Active)
│       ├── admin/
│       │   ├── layout.js         *calls /me, role-gates admin routes, AdminDataProvider + Accounts aside
│       │   └── page.js           *Create an Account
│       ├── globals.css           *global styling
│       ├── layout.js             *root layout (AuthProvider, Navbar, Footer)
│       └── page.js               *main landing page (static)
├── docs/                         *reference docs, imported from CLAUDE.md
│   ├── flows.md                  *behavioral spec for every flow
│   ├── api.md                    *API contract (copy of backend docs/endpoints.md)
│   └── scaling.md                *rules for changing the app after the MVP (frontend side)
├── .env.example
├── .prettierrc
├── eslint.config.mjs             *ESLint (Next.js config), run with npm run lint
├── jsconfig.json                 *the `@/*` → `src/*` import alias
├── next.config.mjs               *dev-only rewrite of /api/* to the local backend
├── vitest.config.mjs             *test config (jsdom, setup file, mocks reset per test)
├── AGENTS.md                     *Next.js agent notes, written and re-added by `next dev`
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

**Progress:** steps 1–6 are done and merged (frontend step 3 in PR #3, step 5 in PR #5, step 6 in PR #6), so the MVP Build Order is complete. The code review (PR #7) is merged, and the frontend has a unit test suite (`npm test`). The rules for changing the app after the MVP are in `docs/scaling.md` (PR #9). Nothing is deployed to production yet, so `docs/scaling.md` applies from the first production deploy. The test site owner Richard Marafioti (`steviethedogchi@gmail.com`) and the Stevie The Dog website exist, and signing in as that owner routes to `/dashboard`. Update this line as each step merges. Feature 1 (post body as elements) is merged in both repos: frontend PR #10, backend PR #13. Post-MVP work is tracked under Features below. The general styling and Feature 2 are merged (PR #15). Feature 4 Post body formatting is merged (frontend PRs #16 and #17, backend PR #20): bold, italic, bold-italic and links inside paragraphs (links may sit inside the formats) with editor-style Bold / Italic / Link icon buttons and Ctrl / Cmd shortcuts, the shared `_lib/postFormatting.js` parser and `FormattedText` renderer, paragraph link validation with the contract's messages, and `LinkFields` and the post's links list removed. Feature 3 Post preview is merged (PR #18): the live preview beside the Create / Edit Post form (a hide / reveal toggle on desktop, Preview / Back to edit on a phone, the date shown first), a single Publish button, the dialog's fixed title and X, and the paragraph links list (edit and delete icons, a Bold-only Link panel with links bold by default, the toolbar never formatting a link). Since PR #15, new features are styled in Rich's conventions (Anti-Patterns → New styling). Still to bring into `docs/flows.md` in the docs alignment session: the em dashes left in user-facing text (the post page's empty-field "—", and the two "No new API key or webhook secret were generated — …" messages). Next steps, in order: Feature 5 Image uploads, the last feature before launch: its contract is merged (step 1, PR #19), and the backend (step 2) and the frontend upload (step 3) are built on their `feat/image-uploads` branches; the frontend is browser-tested end to end and in its PR, and the backend waits on Rich's Postman test before its PR; then a docs alignment session across the backend docs, these docs and the master doc; then security hardening; then the production deploy. Four client websites are waiting to onboard after launch. An Image library (reuse stored images) is in Planned Later; the backend confirmed (2026-10-21) that image rows may share a `src` and that no save or cleanup deletes a file a row still uses.

## Features

New work after the MVP Build Order, numbered and named the same as in the backend's CLAUDE.md. Each one is its own branch → plan → approval → build → verify → PR (backend `docs/scaling.md` §9). Entries here describe the frontend's side.

1. **Post body as elements** — both. Branch `feat/post-elements`.
   - `PostBodyFields` edits the body as ordered paragraph and image elements: Move up / Move down, at most 5 paragraphs and 5 images, and at least one paragraph with text.
   - `LinkFields` and the shared `ItemFields` replace `ImageLinkFields` (both since removed: `LinkFields` in Feature 4, `ItemFields` in Feature 5).
   - The post page renders the body in order, with line breaks kept.
   - `docs/api.md` copied the new contract.

   Merged in both repos (frontend PR #10, backend PR #13).

2. **Admin Accounts aside** — frontend only. Branch `12-styling`.
   - The account list moves from the `/admin` page into `AccountsAside`, rendered by the admin layout so it is present on every `/admin` route: top right, below the Navbar, closed by default, overlaying the page when open. At phone width the closed toggle shows only its icon; open, it shows "Accounts" as on desktop.
   - Each account's websites and its "Link a Website" button sit in a "Websites" `<details>` disclosure.
   - `AdminDataContext` (`useAdminData()`) shares `useAccounts()` and `useAllWebsites()` between the aside and the Create an Account page.
   - `react-icons` added, for icons only.

   In the `12-styling` PR, not merged.

3. **Post preview (v1)** — frontend only. Branch `feat/post-preview`.
   - The Create / Edit Post form shows the post live as it is typed, with its formatting, as it will read on the client website without that site's own styling: the date first (a reader sees how recent the post is before anything else), then header, sub header and the body in order. An image shows once its fields are complete, with Next.js `<Image>` at its stored `width` and `height`, unoptimized, so no `images.remotePatterns` entry is needed.
   - The form's one save button reads **Publish** (Create and Edit). Desktop: the preview sits beside the form, open by default, with a hide / reveal toggle like the Accounts aside. Phone width: a **Preview** button swaps the form for the preview, which has **Back to edit** and its own **Publish** (submitting the same, hidden form); the form stays mounted meanwhile so nothing typed is lost.
   - `PostPreview` renders it; `useIsPhone()` tells the two layouts apart. No API contract change.

   Merged (PR #18). Rich tested it on desktop and phone.

4. **Post body formatting** — both. Branch `feat/post-body-formatting`. Built before Feature 3.
   - A paragraph's text can hold bold (`**text**`), italic (`*text*`), bold-italic (`***text***`) and links (`[text](https://…)`), and the formats may contain links, specced in `docs/api.md` → Paragraph formatting. The links list leaves `Post`, the create and edit request bodies and `PublicPost`, and the `link` table is dropped. Breaking, made in place under the pre-launch rule (`docs/scaling.md` §0); the test link rows are dropped, not migrated. "Invalid image or link." becomes "Invalid image." The Stevie The Dog client template renders the markup.
   - On the frontend, `LinkFields` and the post's links list go away, each paragraph gets Bold / Italic / Link buttons, `_lib/postFormatting.js` holds the shared parser and link check, and `FormattedText` renders paragraphs on the post page (and later the preview).

   Merged (frontend PRs #16 and #17, backend PR #20). The Stevie The Dog template, in its own repo, renders the markup when Rich schedules it, with its own handoff.

5. **Image uploads** — both. The last feature before launch. Site owners upload images from the post form into **3DWD's** Cloudinary account, so they no longer need their own Cloudinary account. Decisions (2026-10-20):
   - **Vendor:** Cloudinary, under 3DWD's account. Cloudflare R2 is the fallback if the free tier (25 credits a month) is outgrown; 10–15 clients are expected in the next year. If it comes to that, new uploads switch to R2, old images stay, and an optional one-off script copies them and rewrites `image.src`.
   - **The browser holds the image until Publish.** The form and Preview show a picked image from memory. On Publish, the frontend asks for one signed upload (`POST /api/siteOwner/uploads/sign`, ownership-checked, with every signed parameter built by the backend), uploads each new image straight to Cloudinary, then saves the post with the returned `secure_url`, `width` and `height`. An abandoned form uploads nothing. No widget, no temp folder.
   - **Folders:** one root per environment (`3dwd/` in production, `3dwd-dev/` locally, from `CLOUDINARY_FOLDER`), and one subfolder per website. Its name is a new `website.media_folder` column, set from the URL when the website is created (`https://www.steviethedog.com` → `steviethedog`) and backfilled for Stevie.
   - **The database is the record of which images are kept.** A daily cleanup (`npm run sweep:uploads`, a Railway cron service once deployed) deletes uploads under the environment root older than 24 hours that no `image` row references. That covers images removed in an edit, and an upload whose save then failed. Post saves never call Cloudinary. Archived posts keep their images.
   - **Upload only:** pasting a URL is removed. The backend accepts only an image `src` in that website's folder; another website's folder is 400 "Invalid image."
   - **Form timeout (frontend):** an open Create / Edit Post form times out 20 hours after opening, or at session expiry if that comes first, and clears with a timed-out message.
   - **Folder names (`media_folder`):** strip `www.`, drop the top-level domain, dots → hyphens (`steviethedog`, `shop-example-co`); `-2`, `-3`… on a clash. Set once and never changed (backend `docs/setup.md` → Image Hosting).
   - **Upload rules:** jpg, png and webp, at most 10 MB (checked by the frontend; the formats are also signed). A signed `c_limit,w_2500,h_2500` scales large photos down as Cloudinary stores them.
   - **Sign response:** `{ uploadUrl, fields }`; `fields` is posted to Cloudinary unchanged, so its keys are Cloudinary's (the one exception to camelCase).
   - **Testing:** the backend's `npm test` needs no Cloudinary account (the signature is checked against a fixed secret; the cleanup mocks Cloudinary's Admin API). The backend's manual test uses curl or Postman against 3DWD's `3dwd-dev` folder: sign, upload, then save a post with the returned `secure_url`. No frontend is needed until step 3.
   - **Order:** the contract on a docs branch first, then the backend, then the frontend upload. Breaking (tighter `src` rule) and data-changing (`media_folder` backfill), made in place under the pre-launch rule (`docs/scaling.md` §0).
   - **On the frontend (step 3):** the image fields get a file picker in place of the Image URL field, with the jpg / png / webp and 10 MB check before anything is uploaded; a picked image shows from memory (`URL.createObjectURL`) in the form and the Preview; Publish signs once, uploads each new image to Cloudinary, then saves the post with the returned `secure_url`, `width` and `height`, and saves nothing if any upload fails; Width / Height entry and the `new Image()` auto-fill go; the 20-hour form timeout is added. If the preview moves to optimized `<Image>`, the Cloudinary host joins `images.remotePatterns`.

   The contract is merged in the backend (PR #22) and copied here (PR #19). The backend (step 2) is built on backend branch `feat/image-uploads`, and the frontend upload (step 3) on branch `feat/image-uploads` here: `ImageField` (the file picker, the file check and the object URL), `_lib/uploadImages.js` (sign through `apiFetch`, then each file to Cloudinary), the upload in `PostForm`'s Publish, `useFormTimeout`, and the post page rendering each stored image. The session-expiry half of the timeout calls `/me` whenever the site owner returns to the tab (decided 2026-10-20: no contract change), since the browser can't read the cookie's expiry. Step 3, with its UI and UX clean-up, is browser-tested end to end by Rich (2026-10-21) and in its PR from `feat/image-uploads`. The backend (step 2) is waiting on Rich's Postman test of its routes before its PR.

   Clean-up decisions (2026-10-21): Publish names its step on the button, "Uploading images…" while images upload, then "Publishing…" while the post saves (a visually hidden status line announces it to screen readers), and the line under Publish shows only errors; the post page shows only the alt text under an image, not its size. Rich approved the step 3 wording as built. No separate `uploadImages.test.js`: the `PostForm` tests run the real upload code (Unit Tests → One layer is enough).

   **Known limitation, saved for later:** if a site owner with more than one website publishes, the images upload but the save fails, and they then switch the Website dropdown, the images are still in the first website's folder and the backend answers "Invalid image." No account has two websites yet. The fix, once one does: when the website changes, put the picked file back on every image uploaded for another website, so Publish uploads it again.

## Role Ownership Check Rule

Every read/write operation derives account/website from the session, never from client input, and verifies the requested resource belongs to it. This is enforced by the backend; the frontend never sends an account id and never assumes it can see something just because it has an id.

## Anti-Patterns to Avoid

**Never call `fetch` directly — always use `apiFetch()`:**
`_lib/apiFetch.js` is the only place our API is fetched. The one other `fetch` is the image upload to Cloudinary in `_lib/uploadImages.js`, which goes to Cloudinary rather than our API, so it carries no credentials and no CSRF header, and its signature still comes from our API through `apiFetch`. It prefixes `NEXT_PUBLIC_API_BASE_URL`, always sets `credentials: 'include'`, sends JSON, adds `X-CSRF-Protection: 1` to every POST/PATCH/DELETE, unwraps `{ data }`, throws the `{ error }` envelope as an error the UI can display, and handles 401 (see Session Expiry). Leaving off `credentials: 'include'` or the CSRF header fails silently or with a confusing 403 — that's why it lives in one place.

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

**New styling follows Rich's conventions, never a new visual direction:**
No CSS frameworks or UI component libraries. The one approved exception is `react-icons`, for icons only, chosen by Rich. Never add another UI dependency without his approval. Rich owns the look and reviews it in the browser. Since the general styling pass (PR #15), a new feature may be styled to match what is there, so it lands consistent and easy for him to tweak:

- CSS Modules in `_styling/`, imported as `styles`: extend the module that already styles that area, or add one module per new component (`componentName.module.css`). `globals.css` holds only element rules every page shares.
- Classes only, never ids, with camelCase names that say what the element is (`statusRow`, `addButton`).
- Reuse the existing values: the purple `rgb(117, 99, 236)`, `lightgray` borders, `rem` spacing (0.2, 0.5, 1, 2), flexbox for layout, and the one phone breakpoint `@media (max-width: 667px)` at the end of the file.
- One rule per selector; group selectors only when they share declarations.
- A short comment on any rule whose reason isn't obvious.
- Never invent a new visual direction (new colours, fonts, shadows, animation). If a feature seems to need one, leave it plain and flag it for Rich.

The one inline style is functional: `white-space: pre-line` on post paragraphs in `dashboard/post/[id]/page.js` and `PostPreview.jsx`, which the API contract requires so typed line breaks show. It stays until Rich moves it.

## Patterns and Preferences

**Saving notes:**
When Rich asks to save or remember something, write it into the most fitting project md file (`CLAUDE.md`, a file in `docs/`, or `README.md`), not only into private memory, so it survives a context clear and is visible to everyone working on the repo. In plan mode, where only the plan file can be edited, put the doc edit in the plan.

**Data fetching goes through a per-resource custom hook in `_hooks/`, never inline fetch calls in components:**

- `useAuth()` \*reads AuthContext: `{ user, setUser }`
- `useRoleGate(role)` \*dashboard layouts: calls `/me`, fills AuthContext, redirects on role mismatch
- `useAccounts()` \*admin: all site owner accounts with their websites; also exposes `createAccount` and `linkWebsite`
- `useAllWebsites()` \*admin: every active website (powers the WebsitePicker)
- `useAdminData()` \*admin: reads AdminDataContext, `{ accounts, websites }` (the results of `useAccounts()` and `useAllWebsites()`, called once by the admin layout)
- `useWebsites()` \*site owner: their own websites, each with post summaries
- `usePost(id)` \*site owner: a single post; also exposes `update` and `setStatus`
- `usePosts()` \*site owner: creation only (`create`)
- `useApiResource(path)` \*internal: the shared GET / ignore-stale / 401 / `refetch` logic behind `useAccounts`, `useAllWebsites`, `useWebsites` and `usePost`; never called by components directly
- `useModalDialog()` \*not a data hook: returns the ref for a `<dialog>` that opens with `showModal()` on mount
- `useIsPhone()` \*not a data hook: `true` at phone width (`max-width: 667px`), following the window as it resizes
- `useFormTimeout(onTimeout)` \*not a data hook: times out an open Create / Edit Post form after 20 hours, and checks the session with `/me` whenever the tab is shown again

Every data-fetching hook returns the same shape, plus whichever mutations are relevant to that resource: `{ data, loading, error }`. Without a library enforcing this automatically, consistency has to come from discipline — if one hook returns `{ posts, isLoading }` and another returns `{ data, error }`, every component consuming them needs to remember which shape it's dealing with. One shape, everywhere. Mutations return the API's `data` on success and throw the API error on failure. After a successful mutation, refetch the list it affects: list hooks also expose `refetch()` for this, and keep their current `data` while refetching so the list doesn't flash back to "Loading…".

**Role-gating happens once, at the layout level, not per page:**
`/dashboard/layout.js` and `/admin/layout.js` each call `GET /api/auth/me` on load, put the user in AuthContext, and redirect if the role doesn't match — a site owner on `/admin` goes to `/dashboard`, an admin on `/dashboard` goes to `/admin`. This is UX only; the backend enforces access on every request.

**Session expiry (any 401):**
`apiFetch` handles a 401 the same way everywhere: a full page load to `/sign-in?expired=1`, which resets all client state and so clears AuthContext; the sign-in page shows "Your session expired, please sign in again." Unsaved form data is lost. Exception: the login call itself — its 401 is "You are not authorized to log in." and is shown in the sign-in dialog instead.

**Every pop-up is a native `<dialog>`:**
For accessibility, every pop-up (signing in, errors, success messages, the Create/Edit Post forms, confirmations, the one-time reveal) uses a native `<dialog>` opened with `showModal()`. Every dialog closes with the shared `DialogCloseButton`: an X in its top right corner, named "Close" for screen readers, that stays in view while the dialog scrolls. Two exceptions: the one-time reveal keeps its labelled Close button and has no X, and `ConfirmDialog` keeps "Cancel" beside its confirm button as well as the X. Clicking outside a dialog never closes it. Esc closes ordinary dialogs (native behaviour); **only the one-time reveal blocks Esc** (handle the `cancel` event) so credentials can't be lost by an accidental keypress — it closes only with its Close button.

**Destructive actions are gated by a confirmation dialog:**
`ConfirmDialog` gates an action that can't be undone in one step. It is kept for that future use and has no caller now. A post's Active switch is not gated: archiving is a reversible flag, undone with the same switch, and the pill shows the result immediately.

**The one-time key/secret reveal is a single reusable component:**
`CredentialRevealModal` is used by Create an Account and Link a Website now, and will be reused by key rotation later — one piece rather than recreating the "show once, discard on close" logic for each flow.

**Every on/off state is a single reusable `Toggle` switch:**
`Toggle` is used for a post's Active status (the post page and Create a Post), and is the control for every future on/off state (add-ons such as business hours, and turning an account or website on or off). It is a native `<button role="switch">` with `aria-checked`, named by its `label` for what "on" means ("Active"), with any visible heading for the setting ("Status") kept separate. Its optional `offLabel` / `onLabel` words ("inactive" / "active") sit either side, hidden from screen readers. It is always controlled by the saved value and never flips optimistically: the switch moves only once the request succeeds. A reversible on/off state saves in one motion with no confirmation.

**The website picker is a single reusable component:**
`WebsitePicker` is used by Create an Account and Link a Website.

**The post body editor is shared between Create and Edit, not two separate implementations:**
`PostBodyFields` handles the body as an ordered array of paragraph and image elements: add, move up/down, delete, validation, the one-paragraph rule, the per-post limits (5 paragraphs, 5 images), each paragraph (`ParagraphField`: its Bold / Italic / Link buttons, its links list with Edit / Delete, and the `LinkPanel` for adding and editing a link), and each image (`ImageField`: its file picker, the jpg / png / webp and 10 MB check, and the picked file shown from an object URL until Publish uploads it). Width and height are never typed: they come from the file, then from Cloudinary. Create a Post and Edit a Post both use it; Edit additionally keeps each existing image's `id` so the backend can reconcile.

**Paragraph markup is read in one place:**
`_lib/postFormatting.js` reads the markup in `docs/api.md` → Paragraph formatting: `parseParagraph` for rendering and `findLinks` (a port of the backend's one-pass scan) for validation. `FormattedText` renders through it (the post page, and the preview later) and `_lib/validation.js` checks links through it. Nothing else reads the markup, and nothing ever sets raw HTML. Both scans read each character about once, so a long paragraph of unmatched `[` or `*` can't freeze the editor.

**The frontend always consumes camelCase from the API, never snake_case:**
The database uses snake_case (`api_key_hash`), but Prisma's `@map` translates that to camelCase before it ever reaches a response. Frontend code should never need to think about the database's naming convention at all. The one documented exception is `UploadSignature.fields` (`docs/api.md`): it keeps Cloudinary's own form-field names (`api_key`, `timestamp`, …) because it is posted to Cloudinary unchanged. The frontend never reads, renames or rebuilds it.

**Validation rules match the backend exactly:**
Use the limits in `docs/api.md` → Validation rules. Show field messages from the API's `error.fields` next to the matching field when the backend rejects a submission.

**File naming:**
Components in PascalCase.jsx, hooks in camelCase.js prefixed with use, following standard React convention.

**In-line comments:**
Keep all code readable and explicit. Comments should be used to inform other developers of the logic in more abstract code. Make sure all comments have been validated and are truthful. High level comments should be added at the top of each file to explain the file's purpose.

## Out of Scope (do not build)

- Key/secret rotation. `CredentialRevealModal` is written so rotation can reuse it later, but there is no rotation UI in the MVP.
- UI to deactivate/reactivate accounts or websites.
- Drag-to-reorder body elements (they reorder with Move up / Move down).

## Planned Later

Ideas Rich has chosen for later. Not scheduled and not to be built yet. Each becomes a numbered Feature (see Features) when it starts. The backend's CLAUDE.md holds the source copy of this list; this copy matches it item for item, with frontend detail added.

- **Admin action hub.** While Create an Account is the only admin action, `/admin` is that form, with "Create an Account" as its `<h1>`. Once there are more admin actions, `/admin` becomes a main page asking "What would you like to do?", with a choice of actions, each opening its own page: Create an Account, Deactivate an Account, Roll a Secret, Roll a Key. Build it together with the first new admin action (the last three are currently Out of Scope above).
- **Post preview v2 (true preview on the client website).** The client website renders an unsaved post with its own styling, through Next.js draft mode and a short-lived signed token. That needs a new public endpoint and an update to the client template. It brings a draft / published state. Rule: two separate flags, never one flag with two meanings: draft vs published, and hidden vs live. Today `active` means hidden vs live. The new flag's name is decided when this starts. On the frontend, a "Preview on your website" step replaces v1's in-dashboard preview, and the dashboard shows both states.
- **Add-on catalog.** An "Add to your website" list for site owners, each add-on with a one-line description, Photo Gallery and Business Hours first. A website's add-ons go in a backend `website_feature` table, built together with the first add-on. An add-on moves through available → requested → live: the site owner turns it on and fills it in, the administrator sees it as requested, and Rich wires it into the client website and marks it live. An add-on's optional fields sit behind "More options" so the basic form stays short. On the frontend, the list lives on `/dashboard`, and each add-on's status shows in the Accounts aside for the administrator.
- **Administrator notifications.** An alert when a site owner requests an add-on, or one is filled in and ready to wire. The backend sends it from a job row written in the same transaction. Until then, the admin dashboard shows "requested".
- **Site owner collaboration.** Site owners suggest add-ons, or optional fields for existing ones. Rich curates: a suggestion is built when at least two businesses want it. Sharing between owners is opt-in or anonymized. It starts as a shared suggestion board outside the app and moves into the app at roughly 10–20 site owners. Feature creep until live use with the early adopters shows owners want it. Not built before then.
- **Image library (reuse stored images).** Picking the same photo for a new post today uploads a second copy to 3DWD's Cloudinary account. Instead, the image field offers "Choose from your images". A new site owner `GET` (ownership-checked like every site owner route) returns a website's distinct stored images (`src`, `width`, `height`, latest `altText`) from the `image` table, including images on archived posts. It reads the database, not Cloudinary's Admin API: the database is the record of which images are kept, the Admin API is rate-limited, and its listing includes abandoned uploads the cleanup hasn't deleted yet. A reused image is sent in the create or edit body like a new one, without an `id`; its `src` is already in the website's folder, so the `src` rule accepts it. Image rows may share a `src` (no unique constraint), and neither post saves nor the cleanup delete a file while any row refers to it; a test proving the shared-`src` case is written with the feature. The only contract change is the new `GET`, in both repos. Automatic dedupe by content hash was set aside: it needs a signature per file and the site owner never sees it. On the frontend, "Choose from your images" sits in `ImageField` beside the file picker.
- **Streamlined post editor.** After the MVP, the Create / Edit Post editor cuts its clutter: each paragraph and image section collapses (open one to edit it), and "Add a paragraph" / "Add an image" move into a toolbar at the side of the dialog. Frontend only, no contract change. The current editor stays for the V1 MVP.

## Code Style

Formatting is Prettier with default settings (`.prettierrc`), run before every commit (`npm run format`), plus `npm run lint` clean. Prettier settles formatting; the rules below settle what Prettier can't.

- **File shape, top to bottom:** header comment (what the file is for) → `"use client"` if needed → imports (React, then Next, then local) → module constants (`UPPER_SNAKE`) → exported helpers → the main export. Inside a component: hooks and state → derived values → handlers → JSX.
- **Exports:** components and pages use `export default function Name`. Hooks, lib functions and component-adjacent helpers (`toWebsitePayload`, `postToFormValues`) are named exports.
- **Functions:** use function declarations for components, handlers and helpers. Use arrows only inline (callbacks, `.map`, `useCallback` bodies).
- **Naming:** functions that respond to a component-level event (submit, a dialog closing, a select change) are `handleX` (`handleSubmit`, `handleRevealClose`); a function named for the action it performs (`copyAll`, `deleteImage`, `changeStatus`) may be a plain verb. Callback props are `onX`. Booleans read as questions (`loading`, `copied`, `isBlank`). Use the vocabulary of `docs/flows.md` and `docs/api.md` (post, website, account, credentials), not synonyms.
- **Text input:** always `(value ?? "").trim()` before checking emptiness or length. Use the helpers in `_lib/validation.js` instead of re-writing the check inline.
- **Control flow:** early returns over nested `if`/`else`. No nested ternaries in JSX.
- **User-facing strings:** copy them word for word from `docs/flows.md` / `docs/api.md`. Never paraphrase a message the spec states.
- **No em dashes in user-facing text.** Rich's preference: use a comma, a full stop or "!" instead. It applies to every new or changed frontend string and its copy in `docs/flows.md`. Messages that come from the backend (`docs/api.md`) change only together with the backend (`docs/scaling.md` §5).

## Code Review

A review is read-only. It produces findings; it never edits code. Fixes are their own task: plan in plan mode, Rich approves, build, verify in the browser, PR. Every fix must preserve behaviour unless the finding is a bug.

### Checklist

1. **Style is consistent.** The code matches Code Style above. If two files do the same thing two ways, pick the documented way. If no way is documented, raise it so the rule gets written down before anything is changed.
2. **No dead code.** Unused imports, variables, props, exports, files, unreachable branches, commented-out code, and hook return values no caller reads. For each one, decide: delete it, or find out why it isn't used. Unused code is sometimes a sign of a missing wire-up, not junk. The best code is code that was never written.
3. **Explicit, then DRY.** Readability wins over cleverness. But when the same logic appears a **third** time, or twice with a real risk of the copies drifting (validation rules, dialog behaviour, fetch handling), extract it into `_lib/`, `_hooks/` or `_components/`. Don't abstract for a case that doesn't exist yet. A shared piece must be simpler to read than the copies it replaces.
4. **Reads top to bottom as a story.** Each block builds on what came before it: no forward references to helpers defined far below without reason, and no state declared far from where it's used. A reader new to the file should be able to follow it in one pass. Names carry the meaning, so comments don't have to.
5. **Comments are necessary and true.** A misleading comment costs more than a missing one: it sends the next developer, or agent, chasing behaviour that isn't there. For every comment: is it still true of the code next to it? Does it explain _why_ rather than restate _what_? Delete it if not. Every file keeps its header comment, and the header must match what the file does now.
6. **Docs match code.** CLAUDE.md (architecture tree, hook list, Progress line), `docs/flows.md` and `README.md` describe what is actually in the repo. `docs/api.md` is still identical to the API Contract section of the backend's `docs/endpoints.md`, and `docs/scaling.md` still matches the backend rules it cites. Fix whichever side is wrong; if the spec is right and the code differs, that's a bug finding.
7. **Architecture rules still hold.** Re-run the Anti-Patterns list and the Workflow Checklist "Checks after building" against the code: `apiFetch` only, the `{ data, loading, error }` hook shape, dialogs, no persisted credentials, the static landing page, client-side dashboards, styling in Rich's conventions.
8. **Every data view handles every state.** Loading, error (the API's `error.message`), empty ("No posts yet." etc.), and a backend rejection of a form that passed frontend validation.
9. **Tooling is clean.** `npm test`, `npm run lint`, `npm run format` (no diff) and `npm run build` all pass.

### Output

Return the findings as a list, most important first. Each finding has: the file and line, which checklist item it breaks, what's wrong, the proposed fix, and its type: **bug** (behaviour is wrong), **cleanup** (behaviour-neutral), or **doc** (docs or comments only). When a finding needs Rich to make a style or spec decision, mark it **decision** and don't propose a fix until he does.

### Scope

A full review covers every file under `src/`, plus `next.config.mjs`, CLAUDE.md, `docs/` and `README.md`. A per-step review (the self-review in Workflow Checklist) covers only that step's diff, plus anything the diff duplicates or makes dead elsewhere.

## Documentation Sync

The backend repo (`3d_wd_backend`) runs a sync audit of this repo's docs against its own. The rule lives in the backend's CLAUDE.md → Documentation Sync.

- **The backend docs are the source of truth.**
- The audit runs from the backend repo, which reads this repo's docs read-only. It never edits them.
- This repo receives the findings (Rich pastes them in) and fixes its own docs on its own branch, through the usual plan → approval → PR.
- A finding marked **decision** waits for Rich before anything changes.

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

Don't write a test for: static markup with no logic, styling, a constant (`roles.js`), a one-line pass-through (`useAuth`), or Next.js/React behaviour itself. A page made only of tested pieces needs a test only for the wiring it adds (e.g. the Active switch → status request → pill updates flow).

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
  - Every pop-up is a `<dialog>` with the X close button (the one-time reveal: its labelled Close button) and no outside-click close
  - New styling follows Rich's conventions (Anti-Patterns → New styling), no new visual direction
  - Test: verified in the browser, not just Postman
  - List every record the browser test created (accounts, websites, posts) so Rich can have the backend session delete them
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
