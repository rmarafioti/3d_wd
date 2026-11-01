# Flows

Full behavioral spec for each frontend flow. `CLAUDE.md` holds the short, always-loaded rules (ownership checks, anti-patterns, patterns); this file holds the specific flow detail those rules apply to. Imported from `CLAUDE.md` via `@docs/flows.md`. Request and response shapes for every call referenced here are in `docs/api.md`.

All pop-ups below are native `<dialog>` elements with the X close button in the top right (`DialogCloseButton`), except the one-time reveal, which keeps a labelled Close button, `ConfirmDialog`, which has only its confirm button and a cancel button ("Cancel", or "Keep editing" when cancelling a post or gallery) so the user makes the choice, Create / Edit Post's and Create / Edit a Gallery's smaller dialogs (the steps, Add / Edit from the toolbar, and the crop dialogs), which have a Cancel button instead, the sign-in dialog, which has no X while it reads "Signing in…", and the Submit progress dialog, which has no X and ignores Esc while Submit runs. They are never closed by clicking outside (see CLAUDE.md → Every pop-up is a native `<dialog>`).

---

## App Shell

**Root layout (`app/layout.js`):** wraps every page in `AuthProvider` (AuthContext, starts empty — it does **not** fetch), `Navbar` and `Footer`. `GoogleOAuthProvider` is **not** here; it wraps the sign-in page only.

**Navbar `HomeLink`:** a small client component that reads `useAuth()`: the "3D Web Dev" link, the navbar's way home from any page.

- No user in context → links to `/` (the landing page and sign-in page).
- Admin → links to `/admin`; site owner → links to `/dashboard` (`HOME_BY_ROLE`), so a signed-in user always has a way back to their dashboard. Only signing out leads back to the landing page.

**Navbar `AuditEventsLink`:** a small client component that reads `useAuth()`: an "Audit Events" link to `/admin/auditEvents`, shown to the admin only. It sits beside `AuthButton`. With no user in context, or a site owner, it shows nothing.

**Navbar `AuthButton`:** a small client component that reads `useAuth()`.

- No user in context → reads "Sign in" and links to `/sign-in` with a plain link (a full page load, not a client-side route), so `/sign-in` arrives with its own Content Security Policy rather than keeping the landing page's (see Proxy).
- User in context → reads "Sign out". On click: `POST /api/auth/logout` (which ends every session of the account), clear AuthContext, then a full page load to `/`.

On the landing page and sign-in page the context is always empty (signed-in users never reach them — see Proxy), so they always show "Sign in". On the dashboards the layouts have filled the context, so they always show "Sign out".

**Navbar `DashboardTitle`:** a small client component that reads `useAuth()` and names the dashboard, replacing a heading on the dashboard pages.

- No user in context → shows nothing (the landing page and sign-in page).
- Admin → "Admin Dashboard".
- Site owner → "{name}'s Dashboard", with the site owner's name from `/me`.

**Proxy (`src/proxy.js`):** runs on every page request (not the API, Next's static files and images, the favicon or prefetches) and does two jobs.

- **Content Security Policy, by page type** (`_lib/contentSecurityPolicy.js`). A static page, listed in `STATIC_PATHS` (only `/` today), gets a fixed policy: its prerendered HTML can't carry a nonce, so its scripts are allowed with `'unsafe-inline'`, which is safe only because it shows no user content and holds no session. Every other page gets a fresh nonce per request, set on the request and the response, with `script-src 'self' 'nonce-…' 'strict-dynamic'`; Next stamps the nonce on its own scripts, and scripts they add (the Google sign-in script) are trusted through `'strict-dynamic'`. Those pages render per request for this: `/sign-in` reads `searchParams`, and the `/dashboard` and `/admin` layouts call `connection()`. A page not listed as static gets the nonce policy, so a forgotten static page breaks loudly rather than a session page going quietly weak. A policy belongs to the document, so a link from a static page to a session page is a full page load ("Sign in" in `AuthButton`). Every page also gets `Referrer-Policy`, `Permissions-Policy`, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Cross-Origin-Opener-Policy: same-origin-allow-popups` (so the Google sign-in pop-up can still report back) from `next.config.mjs`, and both policies carry `frame-ancestors 'none'` (the newer form of `X-Frame-Options`).
- **Redirect**, on `/` and `/sign-in` only: if the request has a `session` cookie, redirect to `/dashboard`. It never decodes the cookie. An admin redirected to `/dashboard` is sent on to `/admin` by the dashboard layout. A signed-in user who wants the landing page signs out first, which routes them there. If the cookie is stale, the backend clears it on the first 401, so the user is never stuck in a redirect loop.

**Dashboard layouts (`dashboard/layout.js`, `admin/layout.js`):** small Server Components that only make the route render per request (for the nonce, see Proxy) and render the client layouts in `_layout/DashboardLayout.jsx` and `_layout/AdminLayout.jsx`. Those render no user data on the server. On load, they call `GET /api/auth/me`.

- While loading: render nothing but a minimal "Loading…" text.
- 401: handled by `apiFetch` (redirect to `/sign-in?expired=1`).
- Any other error: show the API's `error.message` instead of the page.
- Role matches the section: store the user in AuthContext and render the page.
- Role doesn't match: site owner on `/admin` → `/dashboard`; admin on `/dashboard` → `/admin`.

**Session expiry:** any 401 from any call other than login → `apiFetch` does a full page load to `/sign-in?expired=1`, which resets all client state and so clears AuthContext. The sign-in page, seeing `expired=1`, shows the text "Your session expired, please sign in again." above the Google button.

**Local development setup (done once during Build Order step 2):**

- Add a `rewrites()` entry in `next.config.mjs` that proxies `/api/:path*` to `${API_PROXY_TARGET}/api/:path*`, only when `API_PROXY_TARGET` is set. This makes frontend and backend appear same-origin during development, so the cookie runs as `SameSite=Lax` with no `Secure` flag over plain HTTP — the same `Lax` setting production uses.
- Locally `NEXT_PUBLIC_API_BASE_URL` is empty, so `apiFetch` calls relative `/api/...` paths and the rewrite forwards them. In production it is `https://api.3dwebdev.com`.
- Add `http://localhost:3000` and `https://3dwebdev.com` as authorized JavaScript origins on the Google OAuth client.

---

## Login

On the landing page (`/`) the Navbar's "Sign in" button routes the user to `/sign-in`. The sign-in page holds the Google sign-in button (`GoogleLogin` from `@react-oauth/google`, inside `GoogleOAuthProvider` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`). When the user clicks "Sign in with Google" they are prompted for their Google credentials — however they have set up their Google sign-in security.

If the Google step succeeds, the returned `credential` (a signed Google ID token) is sent with `POST /api/auth/login`. To compensate for latency, a dialog opens reading "Signing in…" while the request is in flight. It has no X: it ends on its own, by routing away on success or by changing to the error below, which brings the X.

- **Success:** the backend sets the httpOnly `session` cookie (every later request carries it automatically) and returns `{ role }` in the JSON body, just for that one moment. The frontend reads it once and routes to `/admin` (admin) or `/dashboard` (site_owner). The layout there then calls `/me` and fills AuthContext.
- **Error (401):** the same dialog changes to the backend's message "You are not authorized to log in." followed by "contact us" — a `mailto:` link to `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL`. The dialog's X closes it, leaving the user on `/sign-in` to try again.
- **Any other error:** the same dialog shows the backend's `error.message` without the "contact us" link, for example "Too many requests. Please try again later." (429, after too many sign-in attempts).
- **Google step fails or is cancelled:** no request is sent; nothing is shown beyond Google's own UI.

For validation purposes, as a final check: confirm the cookie has landed by checking the `Set-Cookie` response header in the Network tab (the cookie can't be read from JS — that's by design).

If an already signed-in user lands on `/` or `/sign-in` directly, the proxy redirects them straight to their dashboard. We can assume a signed-in user wants their dashboard, not the static homepage, and doesn't need to log in again. To reach the landing page they sign out, which routes them there.

## Sign Out

"Sign out" in the Navbar → `POST /api/auth/logout` → clear AuthContext → a full page load to `/`. Logout ends every session of the account, not just this browser's: the next request from any other browser where the user is signed in gets a 401 and goes to `/sign-in?expired=1` (Session expiry). If the request fails, still clear AuthContext and load `/` (the cookie will expire on its own within 24 hours at worst). It is a full page load, not a client-side route, because the client router cache may still hold the proxy's signed-in redirect for `/`, which would bounce the user back to `/dashboard`; a full load asks the server, so the proxy sees the cookie is gone. If the logout request failed and the cookie is still there, the proxy sends the user to a freshly loaded dashboard, which is correct: they are still signed in.

---

## Admin Dashboard (`/admin`)

Hooks used: `useAccounts()`, `useAllWebsites()`, both called once by the admin layout's `AdminDataProvider` and read through `useAdminData()`, so the page and the Accounts aside share the same lists.

The admin dashboard has two parts, plus the Audit Events page (below) at `/admin/auditEvents`:

1. **Create an Account** — the page itself: the form described below.
2. **Accounts aside** — rendered by the admin layout, so it is present on every `/admin` route. It sits at the top right of the admin content, below the Navbar, and is **closed by default** on every page load. Closed, it shows only its toggle: a triangle icon with the text "Accounts", or only the icon at phone width (the button is still named "Accounts" for screen readers, with `aria-expanded`). The triangle points right when closed and down when open, like the marker on each account's "Websites" disclosure. Opening it overlays the page content with the account list (Get All Accounts below); the same toggle closes it. It is a disclosure panel, not a pop-up, so it is not a `<dialog>`.

### Get All Accounts

Hook used: `useAccounts()` → `GET /api/admin/accounts`

Lists every site owner account (active and inactive) sorted by name. Each account shows its site owner name, email and an "active"/"inactive" indicator, and below them a **"Websites"** disclosure (native `<details>`, closed by default). Opened, it lists the websites linked to the account (website name linked to its URL, opening in a new tab, and an "active"/"inactive" indicator) followed by the account's **"Link a Website"** button. An account with no websites shows "No websites linked." there. With no accounts at all, the list shows "No site owner accounts yet." Under each website sits a summary of its galleries (not deleted, newest first), so the administrator can see what the site owner cropped, which Cloudinary's Media Library never shows (crops are rectangles applied to a URL, not uploaded files; Rich decided 2026-10-31). Each gallery shows **Gallery Name:** {galleryName} with its "published" / "draft" pill, **Photos:** {imageCount}, **Thumbnails:** Yes / No and **Mobile crop:** Yes / No (`hasThumbnails`, `hasMobileCrops`: Yes only when every image has that crop). A website with no galleries shows "No galleries yet." The list refetches after a successful Create an Account or Link a Website. The administrator never sees post content or gallery images here: galleries show only as these counts and flags.

### Get All Websites (admin)

Hook used: `useAllWebsites()` → `GET /api/admin/websites`

Fetches every active website (`id`, `websiteName`, `url`, `active` — a `WebsiteSummary`). Because this request is database wide it is admin-only. It powers the `WebsitePicker` in Create an Account and Link a Website, so the administrator can attach an existing website instead of creating a duplicate. Refetch after a successful create/link that created a new website.

### WebsitePicker (shared by Create an Account and Link a Website)

Because a website can have more than one site owner (for example, two people managing one business's site), an account may be linked to a website that already exists. The picker handles both cases:

- A dropdown **above** the Website Name field. The first option, selected by default, is **"Add new website"**; below it every existing website from `useAllWebsites()`, by name.
- **"Add new website" selected:** Website Name and Website URL are empty, editable and required. The Website URL field has the placeholder "https://www.yourwebsite.com" (an example format, not a real site).
- **An existing website selected:** Website Name and Website URL fill in with that website's values and become **locked** (read-only). Selecting a different website swaps the values. Selecting "Add new website" again clears and unlocks both fields.
- The picker reports either `{ websiteId }` (existing) or `{ websiteName, websiteUrl }` (new) to the form that uses it.

### Create an Account

Hooks used: `useAccounts()` (`createAccount`), `useAllWebsites()`

Once the administrator signs in they are routed to `/admin`. The "Create an Account" section holds a form:

- **Site Owner Name** — required, max 100.
- **Site Owner Email** — required, valid email format.
- **WebsitePicker** — Website Name (required, max 100) and Website URL (required, must be a full `https://` URL) when adding a new website; locked and pre-filled when an existing website is picked.

The Submit button stays disabled until every required field is filled and valid. On click, all fields are validated again before anything is sent. Frontend validation messages render **below the Submit button**:

- A site owner name is required
- A site owner email is required
- A valid email address is required
- A website name is required
- A valid URL starting with https:// is required

The payload is `{ name, email, websiteId }` for an existing website, or `{ name, email, websiteName, websiteUrl }` for a new one → `POST /api/admin/accounts`.

- **Backend error:** render `error.message` below the Submit button (and any `error.fields` messages next to their fields). The form keeps everything the administrator typed. Expected messages: "An account with this email already exists." / "A website with this URL already exists. Select it from the dropdown." / "A website with this URL already exists but is inactive. It's named [Website Name]. Reactivate and then try again." / "Website not found."
- **Success, new website** (`credentials` present in the response): open `CredentialRevealModal` showing the website name, URL, API key and webhook secret, and one "Copy all" button that copies all four as "Label: value" lines (Website Name, Website Url, API KEY, Webhook Secret), plus the warning "Copy these now! They will never be shown again." It closes only with its Close button (no outside click, no Esc). Once closed the values cannot be retrieved. The account list refetches as soon as the request succeeds; on close, clear the form and refetch the website list.
- **Success, existing website** (no `credentials`): show a dialog reading "Account created and linked to [Website Name]. No new API key or webhook secret was generated. The website's existing credentials are unchanged." The account list refetches as soon as the request succeeds; on close, clear the form.

### Link a Website

Hooks used: `useAccounts()` (`linkWebsite`), `useAllWebsites()`

Gives an existing site owner another website. Clicking "Link a Website" on an account opens a dialog titled "Link a website to [Account Name]" containing the `WebsitePicker` and a Submit button. Same validation and error display as Create an Account (errors below Submit, data kept).

Payload `{ websiteId }` or `{ websiteName, websiteUrl }` → `POST /api/admin/accounts/:id/websites`.

- **Error:** render `error.message` below Submit. Expected: "This account is already linked to [Website Name]." / "A website with this URL already exists. Select it from the dropdown." / "A website with this URL already exists but is inactive. It's named [Website Name]. Reactivate and then try again." / "Website not found." / "Account not found."
- **Success, new website** (`credentials` present): close the form dialog and open `CredentialRevealModal` exactly as in Create an Account. The account list refetches as soon as the request succeeds; the website list refetches when the reveal closes.
- **Success, existing website:** the dialog reads "[Website Name] linked to [Account Name]. No new API key or webhook secret was generated. The website's existing credentials are unchanged." The account list refetches as soon as the request succeeds.

### Audit Events (`/admin/auditEvents`)

Hooks used: `useAuditEventMonths()` → `GET /api/admin/auditEvents/months`, and `useAuditEvents(month)` → `GET /api/admin/auditEvents?month=YYYY-MM&cursor=`

The read-only audit log, so the administrator can answer "who did what?" without SQL from the Render Shell. Reached from the Navbar's "Audit Events" link. It is an `/admin` route, so the admin layout role-gates it (a site owner goes to `/dashboard`) and the Accounts aside is there too. Nothing on it edits, deletes or exports an event.

- **Heading:** "Audit Events".
- **Layout:** centred like the Create an Account page, in a block as wide as the table: the heading at the table's left edge and the month controls at its right on one row, Hide my sign-ins under the heading at the left edge, then the table, then Load more.
- **Month:** one UTC calendar month at a time, named above the table ("October 2026") between two icon buttons, a left chevron ("Previous month" for screen readers and on hover) and a right chevron ("Next month"). The page first loads the months that have events (`GET /api/admin/auditEvents/months`, newest first), then opens on the newest of them. Each chevron steps only through those months, skipping any month without events, and is disabled at its end of the list. With no events at all, the current month's empty state shows with both chevrons disabled. If the months can't load, the API's `error.message` shows in place of the table. The month sent is `YYYY-MM` in UTC; switching months shows "Loading…" until the new month arrives, and a response for a month already left is never shown.
- **The table:** a read-only columnar table, like a data set, one row per event, newest first (as returned). Columns: Created at, Actor email, Action, Target type, Target id, IP, Metadata. An event's `id` is a backend key and is never shown; it is used only as the `cursor`. Created at shows in the admin's local time. Metadata shows as compact `key: value` pairs (`websiteId: …`, `reason: no_account`). A field the event doesn't have (`null`) is an empty cell. At phone width the table scrolls sideways inside its own box.
- **Load more:** while `nextCursor` isn't `null`, a "Load more" button under the table requests the next page of the same month (`cursor` set to `nextCursor`) and adds it to the end of the table. It reads "Loading…" (disabled) meanwhile, and goes once `nextCursor` is `null`. If it fails, the API's `error.message` shows under it, the rows stay, and the button can be pressed again.
- **Hide my sign-ins:** a `Toggle` (named "Hide my sign-ins") beside the text "Hide my sign-ins", **off by default** on every page load. On, it hides only rows whose `action` is `auth.login_succeeded` or `auth.logout` and whose `actorEmail` is the signed-in admin's own email (from `/me`). Failed logins (`auth.login_failed`) and every change always show. The API always returns every row; the hiding is on the page only. It is off by default because a takeover of the admin's Google account would sign in under the admin's own email, and only the `ip` and time would give it away.
- **States:** while the month loads, "Loading…". An empty month shows "No audit events this month." (an empty state, not an error). When every row of the month is hidden by Hide my sign-ins, "No audit events to show. Your sign-ins are hidden." Any other error shows the API's `error.message` in place of the table.

---

## Site Owner Dashboard (`/dashboard`)

### Get All Websites (site owner)

Hook used: `useWebsites()` → `GET /api/siteOwner/websites`

Fetches the site owner's active websites, each with summaries of its posts and of its galleries. Rendered under a "Your Websites" heading (`WebsiteList`), one section per website: its heading reads "Website: {websiteName}", then a "Posts" heading over the website's post table (`PostTable`), then a "Galleries" heading over its gallery table (`GalleryTable`, see Gallery table). The post table is like the Audit Events table: one row per post and the columns **Created**, **Post Name**, **Status** and a last column holding the row's ⋮ menu (see Post actions menu; its heading "Actions" is for screen readers only). Created is the post's `createdAt` as a local date: every post has one, while Post Date is optional and is only what the site owner shows on their website (Rich decided 2026-10-30). Post Name links to `/dashboard/post/{id}`; Status is the indicator pill reading "published" or "draft". The columns keep fixed widths, so every website's table lines up; only the post name wraps, so the table fits a phone's width; it has no sideways-scrolling box, which would clip the ⋮ menus. Posts are ordered by `createdAt`, newest first (as returned). A website with no posts shows "No posts yet." A site owner with no websites sees "You have no websites yet." "Create a Post" and "Create a Gallery" buttons sit side by side at the top of the page; both are disabled until the websites have loaded, since they fill the forms' Website dropdown.

The same data also fills the website dropdown in Create a Post and Create a Gallery, and gives the gallery forms the names already taken.

### Gallery table

Under each website's "Galleries" heading, a table with one row per gallery (published and draft, newest first as returned) and the columns **Gallery Name** (linked to `/dashboard/gallery/{id}`), **Gallery Code**, **Status** (the "published" / "draft" pill) and the row's ⋮ menu. It has no Created column, so it keeps the post table's width at phone width; the name and the code wrap. A website with no galleries shows "No galleries yet." The Gallery Code is the gallery's `slug`, shown so the site owner can tell Rich which gallery goes where on their website. "Slug" is our technical word and the site owner never sees it (Rich decided 2026-10-31).

Each row's ⋮ (`GalleryActionsMenu`, named "Actions for {galleryName}") works like the post table's: **View** (`/dashboard/gallery/{id}`), **Edit** (`/dashboard/gallery/{id}?edit=1`), **"Status to draft"** / **"Status to publish"** (`PATCH /api/siteOwner/galleries/:id/status`, straight away, then the list refetches; a failure shows in a dialog) and **Delete** (the confirmation in Delete a Gallery, then the list refetches and the gallery leaves its table; a failure shows in a dialog).

### Post actions menu

Each row of the post table ends in a ⋮ button (`PostActionsMenu`), named "Actions for {postName}" for screen readers, with `aria-expanded`: shortcuts to what the post page offers, which keeps its own Edit Post, Delete Post and Published switch.

- Closed by default. Clicking ⋮ opens a short list over the rows below, its top on the row's bottom line and its right edge flush with the table's: **View**, **Edit**, the status item, **Delete**, in that order.
- It is a disclosure, not an ARIA menu: plain links and a button, each reached with Tab. The item under the pointer, or reached with Tab, is highlighted light gray. It closes on Esc (focus goes back to ⋮), on a click outside it (so opening another row's menu closes this one), and once an item is picked.
- **View:** goes to `/dashboard/post/{id}`.
- **Edit:** goes to `/dashboard/post/{id}?edit=1`, where the post page opens Edit Post's review view as soon as the post has loaded, then drops `?edit=1` from the address so a refresh or Back doesn't reopen it. Closing it or submitting leaves the site owner on the post page, as with Edit Post (see Edit a Post).
- **Status:** reads **"Status to draft"** on a published post and **"Status to publish"** on a draft (worded so it reads as the row's Status column, Rich decided 2026-10-30), and saves the other status straight away (`PATCH /api/siteOwner/posts/:id/status` with `{ status }`, see Draft / Publish), with no confirmation, since the same item undoes it. Once it succeeds the list refetches (keeping its rows meanwhile) and the row's pill shows the new status; the site owner stays on `/dashboard`, with no success dialog. A failure shows the backend's `error.message` in a dialog and the row stays as it was (Rich decided 2026-10-30).
- **Delete:** opens the same confirmation as the post page's Delete Post (see Delete a Post), on `/dashboard`. On the `204` the list refetches (keeping its rows meanwhile) and the post leaves its table; the site owner stays on `/dashboard`, with no success dialog. A failure shows the backend's `error.message` in a dialog and the post stays listed.

### Create a Post

Hook used: `usePosts()` (`create`), plus `useWebsites()` for the Website dropdown

Creating a post is a short run of dialogs, each with one job, leading into a review view where the whole post is previewed and every part of it can be changed (Feature 9, Rich's issue #46). Each dialog is a `PostStepDialog`: its title stays put while its content scrolls, and it ends in **Cancel** and its own button. The steps and the Add / Edit dialogs have no X: Cancel is the way out, and an X beside it would look like a second, different one (Rich decided 2026-10-30). The review view, the large dialog with the preview, has no Cancel button and keeps its X in the top right instead, which asks first. Esc works as Cancel everywhere. Only the review view's **Submit** saves anything; until then everything is held in the browser.

1. **"Name your post":** **Post Name** (required, max 100, with a character count) and its help text "Only you see this, it's how you find the post on your dashboard." When the site owner has more than one website, a **Website** dropdown sits above it ("Choose a website" to start, required); with one website it is chosen without asking. **Next** stays disabled until both are valid. **Cancel** closes the dialog at once, since only a name is lost.
2. **"Post details":** the note "These fields are optional.", then **Post Date** (help text "Shown on your website so visitors know how recent the post is."), **Header** (max 150) and **Sub Header** (max 200), each limited field with its character count. Cancel / Next.
3. **"Write your first paragraph":** the note "One paragraph is required for a post.", then the paragraph's fields (see Post body dialogs). Cancel / **Insert**, disabled until the paragraph passes its check.
4. **The review view,** titled "Create a Post" (see below).

From step 2 on, **Cancel**, Esc and the review view's X ask first, with `ConfirmDialog`: "Are you sure you want to cancel this post?", with **"Yes, cancel post"** (everything entered is dropped and the dialogs close) and **"Keep editing"** (back where the site owner was, with nothing lost).

A field's character count ("42 / 100") always sits right above the field, at its right edge: on a line of its own under its help note when it has one (so the note keeps its full width), otherwise at the end of its label's line (`FieldLabel`). A note never comes between the count and the field.

All fields go through the same frontend validation used everywhere else, UX only, never the actual gate. A field's message shows under it once it has been left.

**The review view** sits in one wide dialog with three parts side by side. At phone width they stack: the Add buttons, the toolbar with Submit, then the preview.

- **The Add buttons** on the left, with no heading since they explain themselves (Rich, 2026-10-30): **Add Paragraph** and **Add Image**. The review view has no Cancel button: its X in the top right is its one way out, and asks first, as above (Rich decided 2026-10-30). Each Add opens its dialog on top of the review view (see Post body dialogs). At 5 paragraphs Add Paragraph is disabled with "Maximum of 5 paragraphs" under it; at 5 images, Add Image with "Maximum of 5 images".
- **The preview** in the middle (see Post preview).
- **The toolbar** on the right (`PostToolbar`): one row for every part of the post, top to bottom, each with a ⋮ menu (the shared `ActionsMenu`, the same disclosure as the post table's, named "Actions for post name", "Actions for date", "Actions for paragraph 2"…). Each of the post's own fields reads its label in bold, then its value ("Post Name: Walk day", "Header: A walk"); every row stays on one line, cut off with an ellipsis, so the toolbar keeps its width:
  - **Post name** (it never shows on the website, so it is here rather than in the preview): Edit.
  - **Date, header and sub header:** Edit and Delete. While empty, the row reads "No date", "No header" or "No sub header" and its menu offers only **Add**. Delete empties the field, with no confirmation, since Add brings it back.
  - **"Body":** a heading on a light grey line separates the post's own fields above from its body below, so the two read apart. A list-level backend message for the body (`body`) shows under it.
  - **Each body element,** in order: a paragraph icon and the paragraph's first words (without their markup), or an image icon and its alt text, cut off with an ellipsis. Its menu offers Edit, a **Move up** arrow when there is an element above it and a **Move down** arrow when there is one below (icon buttons named "Move paragraph 2 up" for screen readers, showing "Move up" / "Move down" on hover), and Delete, except on the only paragraph, since every post needs one. A move reorders the toolbar and the preview together and leaves the menu open, so an element can be moved several places; Edit and Delete close it. Deleting an element needs no confirmation: nothing is saved until Submit.
  - Under the list: **Status**, the Published switch (the shared `Toggle`, named "Published" for screen readers) reading "draft" / "published" either side, on by default, so a new post is published. Off saves the post as a draft so it can be published later. Help text: "Set a post to published for it to be live on your website, or draft to save it and publish it at a later date."
  - Then **Submit** (Submit rather than Publish, since what the Status switch says is what's submitted, Rich decided 2026-10-30), disabled until the post is valid.

Every Edit or Add from the toolbar opens its own dialog on top of the review view, working on a copy: the post only changes on its **Save** (a field) or **Insert** (a paragraph or image). Its **Cancel** (or Esc) closes only that dialog, without asking, and leaves the post as it was. A field's dialog is titled "Edit header", "Add a date"… ("Add" while the field is empty) and holds that one field.

**The progress dialog.** While Submit runs, the Submit button is disabled and a small dialog (`SubmitProgressDialog`) sits on top of the review view, naming the step under way, with three animated dots after it (held still when the device asks for less motion): "Preparing photos…" while the new photos are shrunk, "Uploading photos (1 of 3)…" counted as each upload finishes ("(0 of 3)" until the first does), then "Saving your post…" ("Saving your gallery…" in the gallery form). A post with no new photos goes straight to the saving step. It has no X and ignores Esc, since a step can't be stopped part way. On success it closes with the form; on an error it closes and the error shows under Submit as below, with nothing the site owner typed lost (Rich decided the wording 2026-11-01). Screen readers hear each step through its `role="status"` line.

On Submit → `POST /api/siteOwner/posts` with `{ websiteId, postName, header, subHeader, postDate, status, body }` (`status` is `published` or `draft`; `active` is never sent) (empty optional fields sent as `null`; `body` is the elements in order, `{ type: 'paragraph', text }` or `{ type: 'image', image: { src, width, height, altText } }`). The backend independently re-validates every field, confirms the website belongs to the session's account, and creates the post with its body in one transaction.

**Images upload on Submit.** When the body has new images, Submit first shrinks each one in the browser (`_lib/shrinkImage.js`): it is decoded with its own orientation (so a photo the phone saved rotated stays upright), scaled so its long side fits 2500 px (never up, since Cloudinary keeps nothing larger), and re-encoded, a PNG as PNG (keeping its transparency) and a jpg or webp as JPEG at 0.85 quality. Every photo is re-encoded, however small, so its metadata, including a phone photo's GPS location, never leaves the browser (Rich decided 2026-11-01). The jpg / png / webp and 10 MB checks still apply to the file as picked. If the browser can't shrink a file, the picked file goes up as it is. Then Submit requests one `UploadSignature` for the post's website (`POST /api/siteOwner/uploads/sign`, through `apiFetch`), uploads each new image to its `uploadUrl` (every entry of `fields` unchanged, plus the image as `file`; this request goes to Cloudinary, not our API, so it carries no cookie and no CSRF header), then saves the post with each new image's `src` set to Cloudinary's `secure_url` and its `width` and `height` from Cloudinary's response. If any upload fails, the post isn't saved, "Your images couldn't be uploaded, please try again." shows under Submit (Cloudinary's own message is never shown), and everything entered stays. A failed sign shows the backend's message the same way ("Website not found.", or "Too many requests. Please try again later." over the upload-signing limit) and uploads nothing. Images that did upload keep their Cloudinary `src`, so submitting again doesn't upload them twice. Each image `src` must be in the website's upload folder; one outside it is rejected with "Invalid image." (see `docs/api.md`).

**Form timeout:** an open Create / Edit Post times out 20 hours after it opened: its dialogs close and a message dialog reads "This form was open for 20 hours, so it timed out. Nothing was saved. Please open it again." The images it held were only in the browser, so nothing is left behind. The time is checked every minute and whenever the site owner returns to the tab, so a computer waking from sleep times out on time. The session can expire first, and the browser can't read when (the cookie is httpOnly), so each return to the tab also calls `GET /api/auth/me`: an expired session's 401 goes to `/sign-in?expired=1` like any other (Session expiry), which clears the form. Submit signs before it uploads, so an expired session never uploads anything.

- **Success:** close the dialogs and refetch `useWebsites()`, so the new post appears in its website's table on `/dashboard`. There is no success dialog: the new row shows the post was created (Rich decided 2026-10-30).
- **Failure:** the backend's `error.message` renders under Submit, and each `error.fields` message under the toolbar row it belongs to (`postName` under the post name, `body.2.text` under the third element…) and in that row's Edit dialog. Everything entered stays, so nothing needs to be retyped.

### Post body dialogs (shared by Create a Post and Edit a Post)

The post body is an ordered array of elements, each a paragraph or an image, so the client website can interleave text and photos. An element joins the body only through its dialog's **Insert**, and Insert is disabled until the element passes its check, so the body never holds a blank paragraph or an unfinished image.

- **Paragraph dialog** ("Write your first paragraph" in step 3, "Add a paragraph" or "Edit paragraph" from the review view): the paragraph's Bold / Italic / Link buttons, a textarea (required, max 10000) with its character count at the far end of the format buttons' row, just above it, the help text "Line breaks you add will show on your website.", and the links list (see Paragraph formatting). Only the ends are trimmed when sent, so the line breaks inside are kept. Its formatting markup is sent exactly as typed. "Paragraph is required." shows once a blank textarea has been left; a bad link or too long text shows its message straight away.
- **Image dialog** ("Add an image" or "Edit image"): an **Image** file picker (jpg, png or webp) and **Alt Text** (required, max 200, with its character count). Images live in 3DWD's Cloudinary account; nobody types or pastes an image URL. A picked file is checked before it is kept: another format shows "Choose a jpg, png or webp image.", a file over 10 MB "Images must be 10 MB or smaller.", and a file the browser can't read as an image "This file can't be read as an image." The picked image is held in the browser until Submit, shown from memory (an object URL) as a small thumbnail above the picker, and, once inserted, in the preview. Once an image is shown, the note "Choose another file to replace this image." sits under it. While an image is picked and its alt text is blank, the note "Alt text is required to insert the image." shows above the Alt Text field, since the alt text is easy to forget once the image is there. Picking a new file for an existing image, then cancelling, keeps the post's image.
- **Width and height** are never entered: a picked image's are read from the file to show it, and on Submit they come from Cloudinary's response (a photo larger than 2500 × 2500 is shrunk to fit before it is uploaded). An existing image keeps its stored size.
- **One paragraph is required:** Create's step 3 is the first paragraph, and the toolbar never offers Delete on the only paragraph. If the backend still rejects the body, its "Add at least one paragraph." shows under the toolbar's "Body" heading.
- **Limits:** at most **5 paragraphs** and **5 images** per post (the Add buttons, above).
- **Backend field messages** show under their toolbar row: `body.N.text` and `body.N.type` under that element, `body.N.image.<field>` under that image, and `body` (list-level) under the toolbar's "Body" heading. They also show in that element's Edit dialog. Adding, moving or deleting an element shifts the indexes, so the backend's `body.N.…` messages are dropped then rather than shown on the wrong element; the list-level `body` message is dropped too, since the list it described has changed. Inserting an edited element, or saving a field, drops its own messages.
- In Edit, existing images keep their `image.id`; new images and every paragraph have no id.

### Paragraph formatting (in the paragraph dialogs)

A paragraph's text can hold bold, italic, bold and italic together, and links, written as `**bold**`, `*italic*`, `***both***` and `[link text](https://…)`. Bold, italic and bold-italic text may contain links (`**[our menu](https://…)**`); link text is plain. The rules and the exact rendering are in `docs/api.md` → Paragraph formatting; the text is stored exactly as typed.

- Above each paragraph's textarea sit three icon buttons: a bold B, an italic I and a chain link. They work like a text editor's. For screen readers they are named by the paragraph's position, "Bold text in paragraph 2", "Italic text in paragraph 2", "Link text in paragraph 2"; on hover each shows its name and shortcut, for example "Bold (Ctrl+B or ⌘B)".
- **Shortcuts:** Ctrl or Cmd + B, I and K press Bold, Italic and Link while the cursor is in the paragraph.
- **Pressed:** Bold shows as pressed (`aria-pressed`, filled purple) while the cursor or highlighted words are in bold or bold-italic text, Italic while they are in italic or bold-italic text, and Link while its Add panel is open. Bold and Italic can both be pressed.
- **Highlighted words:** Bold / Italic switch their part of the format around the words and keep them highlighted: plain words become `**…**` / `*…*`; Italic on bold words gives `***…***`; Bold off on those leaves `*…*`; switching off the last one removes the markers. Spaces at either end of the highlight stay outside the markers, so the formatting applies.
- **Just the cursor:**
  - Away from any formatted words, Bold / Italic put an empty pair (`****` / `**`) at the cursor with the cursor between the markers, so what is typed next is formatted. This is the only time a click adds new markers: once a space is typed after a run's last `*`, the cursor is away from it again.
  - With the cursor in formatted words (anywhere from just after the opening markers to just before the closing ones), or in an empty pair, Bold / Italic switch their part of the format for the whole run, and the cursor keeps its place in the words. Bold then Italic in an empty pair gives `******`, so what is typed is bold and italic. In `***Hello World***` with the cursor after the `d`, Bold leaves `*Hello World*` and Italic leaves `**Hello World**`. Switching off the last part removes the markers.
  - With the cursor in a run's markers (for example between the two closing `*` of `**bold**`), or just outside them, a click moves the cursor back into the words and changes nothing. Between the markers the buttons show the run's format; just outside them typing is plain, so they don't.
  - Clicks never pile up stars. Just outside an empty `****` or `******`, a click moves the cursor into its middle. Right against stars that aren't a format the editor can read (for example `** word**`, where a space follows the opening marker), a click does nothing.
  - Before the site owner has clicked into the paragraph, the cursor counts as being at the end of its text.
- Markers with only a space after the opening one (`** **`, `* *`, `5 * 3 * 2`) are never treated as a format, so no button shows as pressed there.
- Bold and Italic are never disabled for one another. All three buttons are disabled for a highlight that runs over a line break, since formatting never crosses one, and while the cursor is inside a link's markup (its brackets, text, URL, or its own bold markers) or a highlight covers any part of a link, a whole link included. Bold and Italic format words and characters, never a link: a link's look is set only in its Link panel, and links are managed from the paragraph's links list.
- **Link** opens the Link panel above the textarea to add a link at the highlighted words or the cursor, and shows as pressed while it is open; clicking it again closes the panel, as "Cancel" does. A link can be added inside bold or italic text. On the website and in the preview, a link is underlined (the browser's default for a link) and, by default, bold.
- **The Link panel** (adding, and editing from the links list):
  - **Link text:** when adding from highlighted words, it shows them locked (read-only), so the site owner sees exactly which words become the link; otherwise (nothing highlighted, or editing) it is a field to type into.
  - **Link URL.**
  - **Bold toggle** ("Bold link", the same icon button as the toolbar's, pressed when on): the only look a link can be given. It is **on by default** for a new link, so a link is written `**[menu](https://…)**`; switching it off writes `[menu](https://…)`. Editing a link shows its bold and switches it on or off. There is no Italic for links. When the link sits inside larger bold or italic words (typed by hand, or a link added inside bold text: `**see [map](https://…) now**`), it takes that look on and can't have its own: the toggle shows it and is disabled, with the note "Bold from the words around it." / "Italic from the words around it." / "Bold and italic from the words around it." A hand-typed italic link keeps its italic when its Bold is switched.
  - **"Add link" / "Update link"** and **"Cancel".** As in the other forms, each field is checked with the contract messages, shown under the field once it has been left ("Each link needs link text." / "Link text must be 100 characters or fewer." under Link text; "Each link must be a valid URL starting with https://" under Link URL, the same `https://` check as the image and website URLs), and the button stays disabled until both fields are valid. "Update link" also stays disabled until something has changed: the text, the URL or its Bold. Saving writes the link into the text and closes the panel. "Cancel" closes it with the text unchanged. Editing the paragraph's text while it is open also closes it, so the place it would write to is never stale.
- **Links list:** under the textarea, each paragraph that has links lists them in a "Links in this paragraph" disclosure (native `<details>`, closed by default, so it stays out of the way until wanted), read from the text every time, so links typed by hand appear too. Each row shows the link text and its URL, with an edit (pencil) and a delete (trash can) icon button on the same line, and the link's own message under them if it fails its check. The icons show "Edit link" / "Delete link" on hover and are named for screen readers by the link's position: "Edit link 1 in paragraph 2", "Delete link 1 in paragraph 2".
  - **Edit** opens the Link panel under that row, filled in with the link's text, URL and bold, and shows as pressed (filled purple, `aria-pressed`) while it is open; clicking it again closes the panel. "Update link" rewrites just that link (with its own bold / italic markers) and leaves the rest of the text alone.
  - **Delete** removes the link and keeps its words, and any bold of its own around them, then closes the list: "See [our menu](https://…) today" becomes "See our menu today", and `**[menu](https://…)**` becomes `**menu**`.
- Typing the markup by hand works the same way.
- Every link in the text is checked, the link text before its URL, and the first failing link's message shows under the paragraph: "Each link needs link text." / "Link text must be 100 characters or fewer." / "Each link must be a valid URL starting with https://". The backend's `body.N.text` message shows there too.

### Post preview (in the review view)

The review view shows the post as it will read on the website, so the site owner sees their bold, italic and links in action before saving. It shows the current, unsaved values; nothing is saved until Submit. The client website's own styling isn't applied (Post preview v1).

- **Content**, in order: the post date first, so a reader sees how recent the post is before anything else; then the header (as a heading) and the sub header, each only when filled in; then the body in order. Each paragraph shows with its line breaks and its formatting, through the same `FormattedText` as the post page. Each image shows at its width and height (Next.js `<Image>`, unoptimized, so neither the picked file's object URL nor a Cloudinary URL needs a host list); a picked image shows from memory, before it is uploaded. The post name isn't shown: it never appears on the website, and it heads the toolbar instead.
- It is always shown beside the toolbar (below it at phone width); it has no hide toggle.

### Get a Post by ID

Hook used: `usePost(id)` → `GET /api/siteOwner/posts/:id`

Each post on `/dashboard` links to `/dashboard/post/{id}`. This page shows everything about the post: website name, post name, published/draft pill, post date, header, sub header, the body in order (each paragraph with its line breaks kept via `white-space: pre-line` and its formatting rendered by `FormattedText`, with links opening in a new tab; each image shown at its stored size, unoptimized and scaled to fit the page, with "Alt Text: {altText}" beneath it), plus created and last-updated dates. An empty post date, header or sub header shows "None". It is where the site owner reaches the post's operations: "Edit Post" and "Delete Post" side by side at the end of the page (see Delete a Post), and the Published switch to the right of the pill (see Draft / Publish). A 404 shows "Post not found." with a link back to `/dashboard`.

### Edit a Post

Hook used: `usePost(id)` (`update`)

On `/dashboard/post/{id}` an "Edit Post" button (or, from `/dashboard`, a post's ⋮ menu → Edit, see Post actions menu) opens the review view of Create a Post straight away, titled "Edit Post", filled in from the post already loaded by `usePost(id)` (including its body). There are no steps to walk again: every part is changed from the toolbar, and the Add buttons add paragraphs and images, with the same dialogs, checks and limits. Two differences from Create:

- **No Website field:** a post never moves to another website.
- **No Status switch:** status changes only through the Published switch on the post page, or the ⋮ menu's status item.

The X and Esc close it at once while nothing has changed. Once something has, they ask first: "Are you sure you want to cancel your changes?", with **"Discard changes"** and **"Keep editing"**.

On Submit → `PATCH /api/siteOwner/posts/:id` with the full form `{ postName, header, subHeader, postDate, body }`: `body` in its new order, existing images carry their `image.id`, new ones don't, removed ones are simply absent. The backend updates the post's fields, rewrites the body in the new order and reconciles images (update existing, insert new, delete missing) in one transaction; if any part fails nothing is edited.

New images upload on Submit exactly as in Create a Post; existing images keep their `image.id`, `src`, `width` and `height` and are not uploaded again. The form timeout applies here too.

- **Success:** close the dialog and stay on `/dashboard/post/{id}`, which already shows the updated post so the site owner can check the edit landed. There is no success dialog (Rich decided 2026-10-30).
- **Failure:** as in Create a Post: the backend's `error.message` under Submit, field messages under their toolbar rows; everything entered stays.

### Draft / Publish

Hook used: `usePost(id)` (`setStatus`); the ⋮ menu's status item uses `usePosts()` (`setStatus`)

A post's `status` is `published` (it shows on the client website) or `draft` (hidden from the website; the site owner still sees it and can publish it later). A draft is not a delete: the post and its images stay, and Delete a Post is its own action. The frontend reads and sends only `status`; the legacy `active` the API still returns beside it is never read.

On `/dashboard` and `/dashboard/post/{id}` every post shows a "published" or "draft" pill. On `/dashboard/post/{id}`, to the right of the pill, a **Published switch** (the shared `Toggle`, named "Published" for screen readers) reads "draft" on its left and "published" on its right, and is on when the post is published. Its track is the pill's green when published and red when a draft; the Status switch in Create a Post is coloured the same. The switch follows the post's saved status: it only moves once the request succeeds, and it is disabled while the request is in flight.

- **Switching it off (draft)** sends `{ status: "draft" }` immediately.
- **Switching it on (publish)** sends `{ status: "published" }` immediately.

There is no confirmation and no success dialog: a status change is undone with the same switch, so the change is one motion. `ConfirmDialog` is for actions that can't be undone in one step, such as Delete a Post.

Request: `PATCH /api/siteOwner/posts/:id/status` with `{ status: "draft" }` or `{ status: "published" }`.

- **Failure:** render the backend's `error.message` in a dialog; the switch and the pill stay as they were.
- **Success:** the pill and the switch change to the new status; the site owner stays on `/dashboard/post/{id}`.

### Delete a Post

Hook used: `usePosts()` (`remove`)

A draft stays on the dashboard; deleting removes a post the site owner no longer wants, from the dashboard and the website. It is a soft delete on the backend (the row stays, with `deleted_at` stamped), but as far as the site owner and the client website can tell the post is gone for good: there is no undelete in the app.

On `/dashboard/post/{id}` a **"Delete Post"** button sits beside "Edit Post", apart from the Published switch. A post's ⋮ menu on `/dashboard` offers the same delete (see Post actions menu). Clicking it opens `ConfirmDialog` reading "Delete {postName}? It will be removed from your dashboard and your website. This can't be undone.", with a "Delete Post" button and "Cancel". It has no X, so the site owner makes the choice. Cancel or Esc close it and send nothing.

Request, on confirm: `DELETE /api/siteOwner/posts/:id`, no body (it carries `X-CSRF-Protection: 1` like every write). The confirm dialog closes, and the page's "Delete Post" button reads "Deleting…", disabled with "Edit Post", while the request is in flight.

- **Success (`204`, no body):** go to `/dashboard`, where the post is no longer listed. Its old URL now shows "Post not found." with the link back to `/dashboard` (Get a Post by ID).
- **Failure:** render the backend's `error.message` in a dialog (for example "Post not found." if it was already deleted); the site owner stays on the post page and can try again.

---

## Photo Galleries (site owner)

A gallery is a section of a client website showing a series of photos (an artwork portfolio, the inside of a business). A website can have many galleries, each with 1 to 30 images in order. Galleries work like posts: `draft` / `published`, deleted for good as far as the site owner can tell, and the same image upload on Submit. Each image may also have two optional crops: a square **thumbnail** and a **mobile** crop at least as tall as it is wide. Request and response shapes are in `docs/api.md` (Feature 10, decided by Rich 2026-10-31).

### Create a Gallery

Hook used: `useGalleries()` (`create`), plus `useWebsites()` for the Website dropdown and the names already taken

Built like Create a Post (`GalleryForm`, with the same `PostStepDialog`s, cancel gate, form timeout and Submit progress), one intent per dialog:

1. **"Name your gallery":** **Gallery Name** (required, max 100, with its count) and its help text "Only you see this, it's how you find the gallery on your dashboard." With more than one website, a **Website** dropdown sits above it, as in Create a Post. A gallery's name is unique among its website's galleries, ignoring case: a name that website's galleries already have shows "A gallery with this name already exists." as soon as it is typed (the backend's 409 message, word for word), and **Next** stays disabled. Only the chosen website's galleries count. **Cancel** closes at once.
2. **"Gallery details":** the note "These fields are optional.", then **Title** (max 150) and **Copy** (a textarea, max 2000, plain text, help text "Line breaks you add will show on your website."), each with its count. Cancel / Next.
3. **"Add your first image":** the note "One image is required for a gallery.", then the image's fields (see Gallery image dialog). Cancel / **Insert**.
4. **The review view,** titled "Create a Gallery".

From step 2 on, Cancel, Esc and the review view's X ask "Are you sure you want to cancel creating this gallery?", with **"Yes, cancel"** and **"Keep editing"** (Rich, 2026-10-31).

**The review view** has the post review view's three parts:

- **Add Image** on the left, disabled at 30 images with "Maximum of 30 images" under it.
- **The preview** in the middle (`GalleryPreview`): the title, the copy with its line breaks, then the images whole, in order, each with its caption under it, side by side at a fixed width (two to a row at phone width) and wrapping onto as many rows as they need. How the website lays the images out, and where it uses the crops, is up to the website.
- **The toolbar** on the right (`GalleryToolbar`), each row with a ⋮ menu, and each of the gallery's own fields reading its label in bold, then its value ("Gallery Name: Our Interior", "Title: Inside"), as in the post toolbar: **Gallery name** (Edit); **Title** and **Copy** (Edit and Delete, or only Add while empty: "No title", "No copy"); an **"Images"** heading (a list-level backend message for `images` shows under it); then each image by its icon and alt text, with Edit, Move up / Move down arrows where it can move, and Delete, except on the only image, since every gallery needs one. Under the images, in a list of its own, the **Mobile Shape** row (Edit, only while an image has a mobile crop, see Consistent crops). Under "Images", what the gallery's crops still lack (see Consistent crops), and under each image the crop it needs. Under the list, the **Status** switch ("Published", on by default; help text "Set a gallery to published for it to be live on your website, or draft to save it and publish it at a later date.") and **Submit**.

Edit / Add from the toolbar opens its own dialog on a copy, as in Create a Post: **Save** (a field) or **Insert** (an image) changes the gallery, **Cancel** leaves it as it was. Renaming checks the name the same way; a gallery keeps its own name.

**Submit** uploads the new images first, exactly as Create a Post does (each photo shrunk, the progress dialog ending in "Saving your gallery…", one signature, each new file to Cloudinary, nothing saved if one fails), then `POST /api/siteOwner/galleries` with `{ websiteId, galleryName, title, copy, status, images }` (blank optional fields as `null`; each image `{ src, width, height, altText, caption, thumbnailCrop, mobileCrop }`, a missing crop `null`). Each new image's crops are first scaled to the stored size (see Crops).

- **Success:** close the dialogs and refetch `useWebsites()`, so the new gallery appears in its website's table. No success dialog.
- **Failure:** the backend's `error.message` under Submit (a taken name's 409, "A gallery with this name already exists.", among them), each `error.fields` message under its toolbar row (`galleryName`, `images.2.caption`, `images.2.thumbnailCrop`…) and in that row's dialog. Adding, moving or deleting an image drops the `images.N.…` messages and the list's `images` message, as for a post body. Everything entered stays.

### Gallery image dialog

"Add your first image" (step 3), "Add an image" or "Edit image":

- **Image** and **Alt Text:** the same file picker, checks and notes as a post image (Post body dialogs).
- **Caption:** optional, max 300, with its count and the note "Optional. Shown with the image on your website."
- **Crops:** the heading "Crops" with "*Optional" beside it, then a **Thumbnail** row, with the note "*A square version for your gallery's grid. Clicking it opens the full image.", and a **Mobile** row, with the note "*A taller version shown on phones, so the image fills more of the screen." (`GalleryCropField`, each note under its label, Rich decided 2026-10-31). Each shows a small picture of its crop once there is one, and **"Crop thumbnail"** / **"Crop for mobile"** (it reads **"Edit crop"** once there is a crop) and, once there is one, **"Remove crop"**. Both are disabled until an image is picked. **Picking another file clears both crops**, since they were drawn on the image it replaces. A crop's backend message shows under its row.
- **Insert** stays disabled until the image has a file and alt text, the caption fits, and its crops follow the gallery's (see Consistent crops). A crop row the other images make required reads "*Required, since your other images have one."

**The crop dialog** (`CropDialog`, "Crop thumbnail" or "Crop for mobile", on top of the image's dialog, Cancel / **Save**): the image under a fixed-shape frame, dragged to place it and zoomed with the wheel, a pinch, or the **Zoom** slider (`react-easy-crop`, Rich approved 2026-10-31). The thumbnail's frame is square. The gallery's first mobile crop has a **Shape** choice: **4:5** (the default), 3:4, 9:16 or 1:1; later ones are cropped in the gallery's shape (see Consistent crops). Re-opening a crop starts from it, in its shape. Save keeps the crop on the image's working copy; Cancel leaves it as it was.

### Consistent crops

A gallery's crops are consistent, so the website's grid and phone layout work (Rich decided 2026-10-31; the backend refuses the same cases): if any image has a thumbnail crop, every image needs one; if any image has a mobile crop, every image needs one; and every mobile crop has one shape. The form steers the site owner so incomplete crops are never submitted:

- **The image dialog:** a crop the gallery's other images have is marked "*Required, since your other images have one.", and Insert waits for it. A new image can't join the gallery without the crops the others have.
- **The mobile shape** is one setting for the whole gallery. The first mobile crop sets it: its crop dialog shows the Shape choices above the frame, each previewing live on the photo, and Save sets the shape. Every later mobile crop is cropped in that shape, with no Shape choices. Once any image has a mobile crop, the toolbar shows a **Mobile Shape** row ("**Mobile Shape:** 4:5") whose ⋮ offers Edit: the "Edit mobile shape" dialog, with the note "*Changing the shape reshapes every image's mobile crop around its centre. You can adjust each one afterwards.", the Shape choices and Cancel / **Save** (disabled until another shape is picked). Save redraws every mobile crop in the new shape around its own centre, at its height, shrunk to fit its image, so nothing is lost and the gallery is never left in two shapes (Rich decided 2026-10-31).
- **The review view:** adding a crop to one image, or removing it from one, can leave the others out of step. Each such image's toolbar row then says what it needs ("Needs a thumbnail crop.", "Needs a mobile crop.", "Mobile crop is a different shape."), the gallery's messages show under "Images" ("Add a thumbnail crop to every image, or remove them all.", "Add a mobile crop to every image, or remove them all.", "Every mobile crop must be the same shape."), and **Submit** stays disabled until every image matches, or the crop is removed from all of them.
- "Same shape" means each mobile crop's width / height is within 1% of the first one's, which allows for whole-pixel rounding (a 4:5 crop stored as 750 × 938).

### Crops

A crop is `{ x, y, width, height }` in the **stored** image's pixels (`docs/api.md` → Notes, Crops). The crop tool works on the image the browser shows: a picked file at its own size, or a stored image at its stored size. A file larger than 2500 × 2500 is shrunk to fit before it is uploaded (and Cloudinary would scale it down anyway), keeping its orientation and proportions, so on Submit each new image's crops are scaled by its stored size, as Cloudinary returns it, over its picked size (`scaleCrop` in `_lib/crops.js`), rounded to whole pixels and kept inside the image: the thumbnail exactly square, the mobile crop at least as tall as it is wide, as the backend checks. A stored image's crops are sent as they are.

### Get a Gallery by ID

Hook used: `useGallery(id)` → `GET /api/siteOwner/galleries/:id`

`/dashboard/gallery/{id}`, built like the post page: website name, gallery name, the published / draft pill with the Published switch, then **Gallery Code** (the `slug`) with the note "Give us this code when you tell us where this gallery goes on your website.", Title and Copy (with its line breaks), then, under an "Images:" heading, the images two to a row on desktop (one at phone width), each as a row of three labelled columns, **Main** (the image, smaller than a post's photo, in its stored proportions), **Thumbnail** and **Mobile** (each crop's picture, or "None"), wrapping on a narrow screen, with its Caption and Alt Text under the row, then created and last-updated dates. An empty title, copy, caption or crop shows "None". "Edit Gallery" and "Delete Gallery" sit side by side at the end. A 404 shows "Gallery not found." with a link back to `/dashboard`. `?edit=1` (the ⋮ menu's Edit) opens Edit once the gallery has loaded, then drops itself from the address.

### Edit a Gallery

Hook used: `useGallery(id)` (`update`), plus `useWebsites()` for the names already taken

"Edit Gallery" opens the review view straight away, titled "Edit Gallery", filled in from the gallery (each image with its id, caption and crops). No Website field and no Status switch. The site owner's websites are fetched while the form is open, so a name another gallery on the website has is refused before submit; until they arrive, the backend's 409 still catches it. The X and Esc close it at once while nothing has changed, then ask "Are you sure you want to cancel your changes?" ("Discard changes" / "Keep editing").

On Submit → `PATCH /api/siteOwner/galleries/:id` with the full form `{ galleryName, title, copy, images }`: images in their new order, existing ones with their `id`, removed ones absent. New images upload first as in Create a Gallery. Renaming never changes the slug. Success closes the form and the page shows the edit (no success dialog); a failure shows as in Create a Gallery.

### Gallery Draft / Publish

Hook used: `useGallery(id)` (`setStatus`); the ⋮ menu's status item uses `useGalleries()` (`setStatus`)

As for a post: the Published switch on the gallery page (and the ⋮ menu's status item) sends `PATCH /api/siteOwner/galleries/:id/status` with `{ status: "draft" }` or `{ status: "published" }` straight away, with no confirmation and no success dialog. The switch moves only once the request succeeds; a failure shows in a dialog.

### Delete a Gallery

Hook used: `useGalleries()` (`remove`)

"Delete Gallery" on the gallery page, or the ⋮ menu's Delete, opens `ConfirmDialog`: "Delete {galleryName}? It will be removed from your dashboard and your website. This can't be undone.", with "Delete Gallery" and "Cancel". On confirm, `DELETE /api/siteOwner/galleries/:id`; the page's button reads "Deleting…" meanwhile. Success (`204`) goes to `/dashboard` (from the page) or refetches the list (from the ⋮ menu). A failure shows the backend's `error.message` in a dialog.
