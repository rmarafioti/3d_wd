# Flows

Full behavioral spec for each frontend flow. `CLAUDE.md` holds the short, always-loaded rules (ownership checks, anti-patterns, patterns); this file holds the specific flow detail those rules apply to. Imported from `CLAUDE.md` via `@docs/flows.md`. Request and response shapes for every call referenced here are in `docs/api.md`.

All pop-ups below are native `<dialog>` elements with a Close button, never closed by clicking outside (see CLAUDE.md → Every pop-up is a native `<dialog>`).

---

## App Shell

**Root layout (`app/layout.js`):** wraps every page in `AuthProvider` (AuthContext, starts empty — it does **not** fetch), `Navbar` and `Footer`. `GoogleOAuthProvider` is **not** here; it wraps the sign-in page only.

**Navbar `AuthButton`:** a small client component that reads `useAuth()`.

- No user in context → reads "Sign in" and links to `/sign-in`.
- User in context → reads "Sign out". On click: `POST /api/auth/logout`, clear AuthContext, route to `/`.

On the landing page and sign-in page the context is always empty (signed-in users never reach them — see Proxy), so they always show "Sign in". On the dashboards the layouts have filled the context, so they always show "Sign out".

**Proxy (`src/proxy.js`):** matches only `/` and `/sign-in`. If the request has a `session` cookie, redirect to `/dashboard`. It never decodes the cookie. An admin redirected to `/dashboard` is sent on to `/admin` by the dashboard layout. A signed-in user who wants the landing page signs out first, which routes them there. If the cookie is stale, the backend clears it on the first 401, so the user is never stuck in a redirect loop.

**Dashboard layouts (`dashboard/layout.js`, `admin/layout.js`):** client components. On load, call `GET /api/auth/me`.

- While loading: render nothing but a minimal "Loading…" text.
- 401: handled by `apiFetch` (redirect to `/sign-in?expired=1`).
- Role matches the section: store the user in AuthContext and render the page.
- Role doesn't match: site owner on `/admin` → `/dashboard`; admin on `/dashboard` → `/admin`.

**Session expiry:** any 401 from any call other than login → `apiFetch` clears AuthContext and routes to `/sign-in?expired=1`. The sign-in page, seeing `expired=1`, shows the text "Your session expired, please sign in again." above the Google button.

**Local development setup (done once during Build Order step 2):**

- Add a `rewrites()` entry in `next.config.mjs` that proxies `/api/:path*` to `${API_PROXY_TARGET}/api/:path*`, only when `API_PROXY_TARGET` is set. This makes frontend and backend appear same-origin during development, so the cookie runs as `SameSite=Lax` with no `Secure` flag over plain HTTP — the same `Lax` setting production uses.
- Locally `NEXT_PUBLIC_API_BASE_URL` is empty, so `apiFetch` calls relative `/api/...` paths and the rewrite forwards them. In production it is `https://api.3dwebdev.com`.
- Add `http://localhost:3000` and `https://3dwebdev.com` as authorized JavaScript origins on the Google OAuth client.

---

## Login

On the landing page (`/`) the Navbar's "Sign in" button routes the user to `/sign-in`. The sign-in page holds the Google sign-in button (`GoogleLogin` from `@react-oauth/google`, inside `GoogleOAuthProvider` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`). When the user clicks "Sign in with Google" they are prompted for their Google credentials — however they have set up their Google sign-in security.

If the Google step succeeds, the returned `credential` (a signed Google ID token) is sent with `POST /api/auth/login`. To compensate for latency, a dialog opens reading "Signing in…" while the request is in flight.

- **Success:** the backend sets the httpOnly `session` cookie (every later request carries it automatically) and returns `{ role }` in the JSON body, just for that one moment. The frontend reads it once and routes to `/admin` (admin) or `/dashboard` (site_owner). The layout there then calls `/me` and fills AuthContext.
- **Error (401):** the same dialog changes to the backend's message "You are not authorized to log in." followed by "contact us" — a `mailto:` link to `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL`. The dialog has a Close button; closing it leaves the user on `/sign-in` to try again.
- **Google step fails or is cancelled:** no request is sent; nothing is shown beyond Google's own UI.

For validation purposes, as a final check: confirm the cookie has landed by checking the `Set-Cookie` response header in the Network tab (the cookie can't be read from JS — that's by design).

If an already signed-in user lands on `/` or `/sign-in` directly, the proxy redirects them straight to their dashboard. We can assume a signed-in user wants their dashboard, not the static homepage, and doesn't need to log in again. To reach the landing page they sign out, which routes them there.

## Sign Out

"Sign out" in the Navbar → `POST /api/auth/logout` → clear AuthContext → route to `/`. If the request fails, still clear AuthContext and route to `/` (the cookie will expire on its own within 24 hours at worst).

---

## Admin Dashboard (`/admin`)

Hooks used: `useAccounts()`, `useAllWebsites()`

The admin dashboard has two sections on one page:

1. **Create an Account** — the form described below.
2. **Accounts** — a list of every site owner account.

### Get All Accounts

Hook used: `useAccounts()` → `GET /api/admin/accounts`

Lists every site owner account (active and inactive) sorted by name. Each account shows its name, email, an "active"/"inactive" indicator, and below it the websites linked to it (website name, URL, "active"/"inactive" indicator). Each account has a **"Link a Website"** button. An account with no websites shows "No websites linked." The list refetches after a successful Create an Account or Link a Website. The administrator never sees post content here.

### Get All Websites (admin)

Hook used: `useAllWebsites()` → `GET /api/admin/websites`

Fetches every active website (`id`, `websiteName`, `url`). Because this request is database wide it is admin-only. It powers the `WebsitePicker` in Create an Account and Link a Website, so the administrator can attach an existing website instead of creating a duplicate. Refetch after a successful create/link that created a new website.

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

- **Backend error:** render `error.message` below the Submit button (and any `error.fields` messages next to their fields). The form keeps everything the administrator typed. Expected messages: "An account with this email already exists." / "A website with this URL already exists — select it from the dropdown." / "Website not found."
- **Success, new website** (`credentials` present in the response): open `CredentialRevealModal` showing the website name, URL, API key and webhook secret, and one "Copy all" button that copies all four as "Label: value" lines (Website Name, Website Url, API KEY, Webhook Secret), plus the warning "Copy these now — they will never be shown again." It closes only with its Close button (no outside click, no Esc). Once closed the values cannot be retrieved. Then clear the form and refetch the account list and website list.
- **Success, existing website** (no `credentials`): show a dialog reading "Account created and linked to [Website Name]. No new API key or webhook secret were generated — the website's existing credentials are unchanged." On close, clear the form and refetch the account list.

### Link a Website

Hooks used: `useAccounts()` (`linkWebsite`), `useAllWebsites()`

Gives an existing site owner another website. Clicking "Link a Website" on an account opens a dialog titled "Link a website to [Account Name]" containing the `WebsitePicker` and a Submit button. Same validation and error display as Create an Account (errors below Submit, data kept).

Payload `{ websiteId }` or `{ websiteName, websiteUrl }` → `POST /api/admin/accounts/:id/websites`.

- **Error:** render `error.message` below Submit. Expected: "This account is already linked to [Website Name]." / "A website with this URL already exists — select it from the dropdown." / "Website not found." / "Account not found."
- **Success, new website** (`credentials` present): close the form dialog and open `CredentialRevealModal` exactly as in Create an Account. Refetch accounts and websites.
- **Success, existing website:** the dialog reads "[Website Name] linked to [Account Name]. No new API key or webhook secret were generated — the website's existing credentials are unchanged." On close, refetch accounts.

---

## Site Owner Dashboard (`/dashboard`)

### Get All Websites (site owner)

Hook used: `useWebsites()` → `GET /api/siteOwner/websites`

Fetches the site owner's active websites, each with summaries of its posts. Rendered as a list per website: the `websiteName` is the heading, and under it each post shows its `postName`, its `postDate` if set, and an indicator pill reading "active" or "inactive". Posts are ordered by `createdAt`, newest first (as returned). Each `postName` links to `/dashboard/post/{id}`. A website with no posts shows "No posts yet." A "Create a Post" button sits at the top of the page.

The same data also fills the website dropdown in Create a Post.

### Create a Post

Hook used: `usePosts()` (`create`), plus `useWebsites()` for the dropdown

The "Create a Post" button on `/dashboard` opens a dialog with a form:

- **Website** — dropdown of the site owner's websites from `useWebsites()`. Required. If the site owner has exactly one website it is pre-selected.
- **Post Name** — required, max 100. Help text: "Only you see this — it's how you find the post on your dashboard."
- **Post Date** — optional date input. Help text: "Shown on your website so visitors know how recent the post is."
- **Header** — optional, max 150. The headline shown on the website.
- **Sub Header** — optional, max 200.
- **Body** — required, max 5000.
- **Images and Links** — `ImageLinkFields` (see below).
- **Active** — a toggle, on by default. Off saves the post as inactive so it can be made active later.

All fields go through the same frontend validation used everywhere else — UX only, never the actual gate. Field messages render next to their field; the Submit button stays disabled until the form is valid.

On submit → `POST /api/siteOwner/posts` with `{ websiteId, postName, body, header, subHeader, postDate, active, images, links }` (empty optional fields sent as `null`, empty lists as `[]`). The backend independently re-validates every field, confirms the website belongs to the session's account, and creates the post with its images and links in one transaction.

- **Success:** close the form dialog; a dialog reads "Post {postName} has been created"; on close, refetch `useWebsites()` so the new post appears on `/dashboard`.
- **Failure:** the backend's `error.message` renders inside the form dialog (and `error.fields` next to their fields). The form keeps everything entered — nothing needs to be retyped.

### ImageLinkFields (shared by Create a Post and Edit a Post)

Images and links are each held in an array in the form.

- Each existing item shows its fields and a "Delete" button that removes it from the array.
- An "Add image" / "Add link" button reveals blank fields for a new item; its "Add" button validates them and appends the item to the array.
- **Image fields:** Image URL (`src`, required, `https://`), Width and Height (required, whole numbers 1–10000), Alt Text (required, max 200). Images are hosted in the site owner's own Cloudinary account; the site owner pastes the Cloudinary URL.
- **Auto-fill width/height:** when a valid `https://` URL is entered, load it in the background with `new Image()`; on load, fill Width and Height from `naturalWidth` / `naturalHeight`. The fields stay editable. If the image fails to load, leave them empty for manual entry (the site owner can read the dimensions in Cloudinary).
- **Link fields:** Link Name (required, max 100) and URL (required, `https://`).
- Limits: maximum **5 images** and **10 links** per post. At the limit, the matching "Add" button is disabled with the text "Maximum of 5 images" / "Maximum of 10 links".
- Items appear in the order they were added. There is no drag-to-reorder.
- In Edit, existing items keep their `id` in the array; new items have no `id`.

### Get a Post by ID

Hook used: `usePost(id)` → `GET /api/siteOwner/posts/:id`

Each post on `/dashboard` links to `/dashboard/post/{id}`. This page shows everything about the post: website name, post name, active/inactive pill, post date, header, sub header, body, every image (with its alt text and dimensions) and every link, plus created and last-updated dates. It is where the site owner reaches the post's operations: "Edit Post" and "Archive Post" / "Make Post Active". A 404 shows "Post not found." with a link back to `/dashboard`.

### Edit a Post

Hook used: `usePost(id)` (`update`)

On `/dashboard/post/{id}` an "Edit Post" button opens a dialog with the same form as Create a Post, pre-filled from the post already loaded by `usePost(id)` (including its images and links), with two differences:

- **No Website field** — a post never moves to another website. The website name is shown as read-only text.
- **No Active toggle** — status changes only through the Archive / Make Active button.

Images and links use `ImageLinkFields`: items can be edited in place, deleted, or added, with the same validation and limits.

On submit → `PATCH /api/siteOwner/posts/:id` with the full form `{ postName, body, header, subHeader, postDate, images, links }` — existing images/links carry their `id`, new ones don't, removed ones are simply absent. The backend updates the post's fields and reconciles images and links (update existing, insert new, delete missing) in one transaction; if any part fails nothing is edited.

- **Success:** close the form dialog; a dialog reads "Post {postName} has been updated"; on close, route to `/dashboard`.
- **Failure:** the backend's `error.message` renders inside the form dialog; entered data stays intact.

### Archive / Make Active

Hook used: `usePost(id)` (`setStatus`)

This is not a true delete — it is a PATCH of the post's `active` flag, for several reasons: all information stays in the database for the application's analytics; site owners can see all of their posts, active or inactive; and site owners can create posts that aren't live yet and activate them later.

On `/dashboard` and `/dashboard/post/{id}` every post shows an "active" or "inactive" pill. On `/dashboard/post/{id}`, next to "Edit Post", a button reads conditionally:

- `active === true` → **"Archive Post"**. Clicking it first opens `ConfirmDialog`: "Are you sure you want to archive {postName}? It will be removed from your website." with "Archive" and "Cancel" buttons. Only "Archive" sends the request.
- `active === false` → **"Make Post Active"**. Sends the request immediately, no confirmation.

Request: `PATCH /api/siteOwner/posts/:id/status` with `{ active: false }` or `{ active: true }`.

- **Failure:** render the backend's `error.message` in a dialog.
- **Success:** a dialog reads "Post {postName} has been updated to Archived" or "…to Active"; on close, route to `/dashboard`.
