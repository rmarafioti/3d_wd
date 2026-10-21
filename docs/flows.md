# Flows

Full behavioral spec for each frontend flow. `CLAUDE.md` holds the short, always-loaded rules (ownership checks, anti-patterns, patterns); this file holds the specific flow detail those rules apply to. Imported from `CLAUDE.md` via `@docs/flows.md`. Request and response shapes for every call referenced here are in `docs/api.md`.

All pop-ups below are native `<dialog>` elements with the X close button in the top right (`DialogCloseButton`), except the one-time reveal, which keeps a labelled Close button. They are never closed by clicking outside (see CLAUDE.md → Every pop-up is a native `<dialog>`).

---

## App Shell

**Root layout (`app/layout.js`):** wraps every page in `AuthProvider` (AuthContext, starts empty — it does **not** fetch), `Navbar` and `Footer`. `GoogleOAuthProvider` is **not** here; it wraps the sign-in page only.

**Navbar `AuthButton`:** a small client component that reads `useAuth()`.

- No user in context → reads "Sign in" and links to `/sign-in`.
- User in context → reads "Sign out". On click: `POST /api/auth/logout`, clear AuthContext, then a full page load to `/`.

On the landing page and sign-in page the context is always empty (signed-in users never reach them — see Proxy), so they always show "Sign in". On the dashboards the layouts have filled the context, so they always show "Sign out".

**Navbar `DashboardTitle`:** a small client component that reads `useAuth()` and names the dashboard, replacing a heading on the dashboard pages.

- No user in context → shows nothing (the landing page and sign-in page).
- Admin → "Admin Dashboard".
- Site owner → "{name}'s Dashboard", with the site owner's name from `/me`.

**Proxy (`src/proxy.js`):** matches only `/` and `/sign-in`. If the request has a `session` cookie, redirect to `/dashboard`. It never decodes the cookie. An admin redirected to `/dashboard` is sent on to `/admin` by the dashboard layout. A signed-in user who wants the landing page signs out first, which routes them there. If the cookie is stale, the backend clears it on the first 401, so the user is never stuck in a redirect loop.

**Dashboard layouts (`dashboard/layout.js`, `admin/layout.js`):** client components. On load, call `GET /api/auth/me`.

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

If the Google step succeeds, the returned `credential` (a signed Google ID token) is sent with `POST /api/auth/login`. To compensate for latency, a dialog opens reading "Signing in…" while the request is in flight.

- **Success:** the backend sets the httpOnly `session` cookie (every later request carries it automatically) and returns `{ role }` in the JSON body, just for that one moment. The frontend reads it once and routes to `/admin` (admin) or `/dashboard` (site_owner). The layout there then calls `/me` and fills AuthContext.
- **Error (401):** the same dialog changes to the backend's message "You are not authorized to log in." followed by "contact us" — a `mailto:` link to `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL`. The dialog's X closes it, leaving the user on `/sign-in` to try again.
- **Google step fails or is cancelled:** no request is sent; nothing is shown beyond Google's own UI.

For validation purposes, as a final check: confirm the cookie has landed by checking the `Set-Cookie` response header in the Network tab (the cookie can't be read from JS — that's by design).

If an already signed-in user lands on `/` or `/sign-in` directly, the proxy redirects them straight to their dashboard. We can assume a signed-in user wants their dashboard, not the static homepage, and doesn't need to log in again. To reach the landing page they sign out, which routes them there.

## Sign Out

"Sign out" in the Navbar → `POST /api/auth/logout` → clear AuthContext → a full page load to `/`. If the request fails, still clear AuthContext and load `/` (the cookie will expire on its own within 24 hours at worst). It is a full page load, not a client-side route, because the client router cache may still hold the proxy's signed-in redirect for `/`, which would bounce the user back to `/dashboard`; a full load asks the server, so the proxy sees the cookie is gone. If the logout request failed and the cookie is still there, the proxy sends the user to a freshly loaded dashboard, which is correct: they are still signed in.

---

## Admin Dashboard (`/admin`)

Hooks used: `useAccounts()`, `useAllWebsites()`, both called once by the admin layout's `AdminDataProvider` and read through `useAdminData()`, so the page and the Accounts aside share the same lists.

The admin dashboard has two parts:

1. **Create an Account** — the page itself: the form described below.
2. **Accounts aside** — rendered by the admin layout, so it is present on every `/admin` route. It sits at the top right of the admin content, below the Navbar, and is **closed by default** on every page load. Closed, it shows only its toggle: a triangle icon with the text "Accounts", or only the icon at phone width (the button is still named "Accounts" for screen readers, with `aria-expanded`). The triangle points right when closed and down when open, like the marker on each account's "Websites" disclosure. Opening it overlays the page content with the account list (Get All Accounts below); the same toggle closes it. It is a disclosure panel, not a pop-up, so it is not a `<dialog>`.

### Get All Accounts

Hook used: `useAccounts()` → `GET /api/admin/accounts`

Lists every site owner account (active and inactive) sorted by name. Each account shows its site owner name, email and an "active"/"inactive" indicator, and below them a **"Websites"** disclosure (native `<details>`, closed by default). Opened, it lists the websites linked to the account (website name linked to its URL, opening in a new tab, and an "active"/"inactive" indicator) followed by the account's **"Link a Website"** button. An account with no websites shows "No websites linked." there. With no accounts at all, the list shows "No site owner accounts yet." The list refetches after a successful Create an Account or Link a Website. The administrator never sees post content here.

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

- **Backend error:** render `error.message` below the Submit button (and any `error.fields` messages next to their fields). The form keeps everything the administrator typed. Expected messages: "An account with this email already exists." / "A website with this URL already exists — select it from the dropdown." / "A website with this URL already exists but is inactive — it's named [Website Name]. Reactivate and then try again." / "Website not found."
- **Success, new website** (`credentials` present in the response): open `CredentialRevealModal` showing the website name, URL, API key and webhook secret, and one "Copy all" button that copies all four as "Label: value" lines (Website Name, Website Url, API KEY, Webhook Secret), plus the warning "Copy these now! They will never be shown again." It closes only with its Close button (no outside click, no Esc). Once closed the values cannot be retrieved. The account list refetches as soon as the request succeeds; on close, clear the form and refetch the website list.
- **Success, existing website** (no `credentials`): show a dialog reading "Account created and linked to [Website Name]. No new API key or webhook secret were generated — the website's existing credentials are unchanged." The account list refetches as soon as the request succeeds; on close, clear the form.

### Link a Website

Hooks used: `useAccounts()` (`linkWebsite`), `useAllWebsites()`

Gives an existing site owner another website. Clicking "Link a Website" on an account opens a dialog titled "Link a website to [Account Name]" containing the `WebsitePicker` and a Submit button. Same validation and error display as Create an Account (errors below Submit, data kept).

Payload `{ websiteId }` or `{ websiteName, websiteUrl }` → `POST /api/admin/accounts/:id/websites`.

- **Error:** render `error.message` below Submit. Expected: "This account is already linked to [Website Name]." / "A website with this URL already exists — select it from the dropdown." / "A website with this URL already exists but is inactive — it's named [Website Name]. Reactivate and then try again." / "Website not found." / "Account not found."
- **Success, new website** (`credentials` present): close the form dialog and open `CredentialRevealModal` exactly as in Create an Account. The account list refetches as soon as the request succeeds; the website list refetches when the reveal closes.
- **Success, existing website:** the dialog reads "[Website Name] linked to [Account Name]. No new API key or webhook secret were generated — the website's existing credentials are unchanged." The account list refetches as soon as the request succeeds.

---

## Site Owner Dashboard (`/dashboard`)

### Get All Websites (site owner)

Hook used: `useWebsites()` → `GET /api/siteOwner/websites`

Fetches the site owner's active websites, each with summaries of its posts. Rendered under a "Your Posts" heading as a list per website: each website's heading reads "Website: {websiteName}", and under it each post shows a link to `/dashboard/post/{id}` followed by an indicator pill reading "active" or "inactive". The link reads "{postDate} - {postName}" when the post has a date, otherwise just "{postName}". Posts are ordered by `createdAt`, newest first (as returned). A website with no posts shows "No posts yet." A site owner with no websites sees "You have no websites yet." A "Create a Post" button sits at the top of the page; it is disabled until the websites have loaded, since they fill its Website dropdown.

The same data also fills the website dropdown in Create a Post.

### Create a Post

Hook used: `usePosts()` (`create`), plus `useWebsites()` for the dropdown

The "Create a Post" button on `/dashboard` opens a dialog with a form:

- **Website** — dropdown of the site owner's websites from `useWebsites()`. Required. If the site owner has exactly one website it is pre-selected.
- **Post Name** — required, max 100. Help text: "Only you see this, it's how you find the post on your dashboard."
- **Post Date** — optional date input. Help text: "Shown on your website so visitors know how recent the post is."
- **Header** — optional, max 150. The headline shown on the website.
- **Sub Header** — optional, max 200.
- **Body** — `PostBodyFields` (see below): an ordered list of paragraphs and images. Starts with one empty paragraph.
- **Status** — the Active switch (the shared `Toggle`, named "Active" for screen readers) reading "inactive" / "active" either side, on by default. Off saves the post as inactive so it can be made active later. Help text: "Set a post to active for it to be live on your website, or inactive to save it and make it live at a later date."

All fields go through the same frontend validation used everywhere else — UX only, never the actual gate. Field messages render next to their field; the **Publish** button (the form's submit button, for both Create and Edit) stays disabled until the form is valid.

On Publish → `POST /api/siteOwner/posts` with `{ websiteId, postName, header, subHeader, postDate, active, body }` (empty optional fields sent as `null`; `body` is the elements in order, `{ type: 'paragraph', text }` or `{ type: 'image', image: { src, width, height, altText } }`). The backend independently re-validates every field, confirms the website belongs to the session's account, and creates the post with its body in one transaction.

**Changing in Feature 5 (step 3):** when the body has new images, Publish first requests one `UploadSignature` for the post's website (`POST /api/siteOwner/uploads/sign`), uploads each new image to its `uploadUrl` (every entry of `fields`, plus the image as `file`), then saves the post with each new image's `src` set to Cloudinary's `secure_url` and its `width` and `height` from Cloudinary's response. If any upload fails, the post isn't saved and the form keeps everything entered. Each image `src` must be in the website's upload folder; one outside it is rejected with "Invalid image." (see `docs/api.md`).

**Form timeout (Feature 5, step 3):** an open Create / Edit Post form times out 20 hours after it opened, or when the session expires if that comes first, and clears with a timed-out message (worded when step 3 is built). The images it holds are only in the browser, so nothing is left behind.

- **Success:** close the form dialog; a dialog reads "Post {postName} has been created"; on close, refetch `useWebsites()` so the new post appears on `/dashboard`.
- **Failure:** the backend's `error.message` renders inside the form dialog (and `error.fields` next to their fields). The form keeps everything entered — nothing needs to be retyped.

### PostBodyFields (shared by Create a Post and Edit a Post)

The post body is an ordered array of elements in the form, each a paragraph or an image, so the client website can interleave text and photos.

- Elements show in body order. Each has "Move up" (disabled on the first), "Move down" (disabled on the last) and "Delete" buttons. For screen readers each button is named by the element's type and its position among that type: "Move paragraph 2 up", "Move image 1 down", "Delete paragraph 1". There is no drag-to-reorder.
- "Add a paragraph" / "Add an image" append a blank element to the end of the body; its fields are validated in place and the Publish button stays disabled until they are valid. Once the body has an element of that type, the button reads "Add another paragraph" / "Add another image", so it is clear the one already filled in counts: what is typed is part of the form, and Submit saves it.
- **Complete it before adding another.** While a paragraph is blank or fails its check (a bad link, too long), the Add paragraph button is disabled; while an image is incomplete, the Add image button is disabled. Being disabled doesn't change their labels.
- **Paragraph:** a textarea (required, max 10000) with the help text "Line breaks you add will show on your website." Only the ends are trimmed when sent, so the line breaks inside are kept. Its formatting markup is sent exactly as typed (see Paragraph formatting below).
- **Image fields:** Image URL (`src`, required, `https://`), Width and Height (required, whole numbers 1–10000), Alt Text (required, max 200). Images are hosted in the site owner's own Cloudinary account; the site owner pastes the Cloudinary URL.
  - **Changing in Feature 5 (step 3):** nobody types or pastes an image URL. The site owner picks an image file (jpg, png or webp, at most 10 MB, checked before anything is uploaded), and Alt Text stays. The picked image is held in the browser and shown from memory in the form and the Preview until Publish. Images live in 3DWD's Cloudinary account, so the site owner no longer needs one.
- **Auto-fill width/height:** when a valid `https://` URL is entered, load it in the background with `new Image()`; on load, fill Width and Height from `naturalWidth` / `naturalHeight`. The fields stay editable. If the image fails to load, leave them empty for manual entry (the site owner can read the dimensions in Cloudinary).
  - **Changing in Feature 5 (step 3):** Width and Height come from Cloudinary's response after the upload (a photo larger than 2500 × 2500 is scaled down to fit as it is stored), so the site owner no longer enters or checks them.
- **One paragraph is required.** While no paragraph has text (the first one is still blank, or every paragraph was deleted), Publish is disabled and the Add buttons are hidden, not disabled: both appear once a paragraph has text. The one exception is when every paragraph was deleted: then "Add a paragraph" shows (it is the only way forward) and the Add image button stays hidden. If the backend still rejects it, its "Add at least one paragraph." shows at the top of the body.
- Limits: maximum **5 paragraphs** and **5 images** per post. At the limit the matching Add button is disabled; its label doesn't change.
- **Notes** explain whatever is disabled, one line each, inside the section they belong to (each section ends in its border):
  - Under an incomplete element's Move up / Move down / Delete buttons: "One paragraph is required to submit a post." while that paragraph is blank and no paragraph has text (the paragraph's own "Paragraph is required." is then hidden, since it would repeat the note); "Complete or delete paragraph to submit." while that paragraph is blank and another has text; or "Complete or delete image to submit." while that image is incomplete.
  - Above the Add buttons, in this order: "One paragraph is required to submit a post." when every paragraph was deleted (so there is no paragraph to show it under), then "Maximum of 5 paragraphs" / "Maximum of 5 images" at the limit.
- A paragraph with text that fails its own check (a bad link, or over 10000 characters) shows its message under the textarea as soon as the problem is there, without waiting for the field to be left, since the format buttons change the text without leaving it. "Paragraph is required." still shows once a blank paragraph has been left.
- Backend field messages show next to their element: `body.N.text` under that paragraph, `body.N.image.<field>` under that image field, `body.N.type` under that element, and `body` (list-level) at the top. Adding, moving or deleting an element shifts the indexes, so the backend's `body.N.…` messages are dropped then rather than shown on the wrong element; the list-level `body` message is dropped too, since the list it described has changed.
- In Edit, existing images keep their `image.id`; new images and every paragraph have no id.

### Paragraph formatting (in PostBodyFields)

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

### Post preview (in Create a Post and Edit a Post)

The form shows the post live as it is typed, the way it will read on the website, so the site owner sees their bold, italic and links in action before saving. It shows the form's current values, unsaved; nothing is saved until Publish. The client website's own styling isn't applied (Post preview v1).

- **Content**, in order: the post date first, so a reader sees how recent the post is before anything else; then the header (as a heading) and the sub header, each only when filled in; then the body in order. Each paragraph with text shows with its line breaks and its formatting, through the same `FormattedText` as the post page. An image only shows once all its fields are complete (`validateImage` passes), so a half-typed URL never shows as a broken image; it shows at its stored width and height (Next.js `<Image>`, unoptimized, so any `https://` host works). With nothing to show yet, it reads "Your post will show here as you type."
  - **Changing in Feature 5 (step 3):** a picked image shows in the preview from memory (before it is uploaded), at its own size, as soon as it is picked.
- **One Publish button.** The form's own button reads **Publish** in both Create and Edit; it is the only one on desktop.
- **Desktop:** the preview sits to the right of the form, in a wider dialog, and is open when the dialog opens. A "Preview" toggle above it (a triangle that points down when open and right when hidden, `aria-expanded`, the same as the Accounts aside) hides it, leaving the form, and reveals it again. The dialog's title and its X stay at the top while the form and preview scroll beneath them, so the X never covers the toggle. The preview stays in view while the form scrolls. Publish stays under the form either way.
- **Phone width:** the form shows on its own, with a **Preview** button beside Publish. Preview swaps the form for the preview, which has **Back to edit** and its own **Publish** (it submits the same form, which is hidden behind the preview). Back to edit returns to the form with everything still typed.
- **Backend errors:** the backend's `error.message` shows under Publish: under the form's, or under the phone preview's while that view is showing. Field messages always show next to their fields in the form; on a phone, Back to edit leads to them.

### Get a Post by ID

Hook used: `usePost(id)` → `GET /api/siteOwner/posts/:id`

Each post on `/dashboard` links to `/dashboard/post/{id}`. This page shows everything about the post: website name, post name, active/inactive pill, post date, header, sub header, the body in order (each paragraph with its line breaks kept via `white-space: pre-line` and its formatting rendered by `FormattedText`, with links opening in a new tab; each image with its alt text and dimensions), plus created and last-updated dates. It is where the site owner reaches the post's operations: "Edit Post" and the Active switch to the right of the pill (see Archive / Make Active). A 404 shows "Post not found." with a link back to `/dashboard`.

### Edit a Post

Hook used: `usePost(id)` (`update`)

On `/dashboard/post/{id}` an "Edit Post" button opens a dialog with the same form as Create a Post, pre-filled from the post already loaded by `usePost(id)` (including its body), with two differences:

- **No Website field** — a post never moves to another website. The website name is shown as read-only text.
- **No Active toggle** — status changes only through the Active switch on the post page.

The body uses `PostBodyFields`: elements can be edited in place (with the same format buttons), moved, deleted or added, with the same validation and limits.

On Publish → `PATCH /api/siteOwner/posts/:id` with the full form `{ postName, header, subHeader, postDate, body }` — `body` in its new order, existing images carry their `image.id`, new ones don't, removed ones are simply absent. The backend updates the post's fields, rewrites the body in the new order and reconciles images (update existing, insert new, delete missing) in one transaction; if any part fails nothing is edited.

**Changing in Feature 5 (step 3):** new images upload on Publish exactly as in Create a Post; existing images keep their `src` and `image.id`. The form timeout applies here too.

- **Success:** close the form dialog; a dialog reads "Post {postName} has been updated"; on close, stay on `/dashboard/post/{id}`, which already shows the updated post so the site owner can check the edit landed.
- **Failure:** the backend's `error.message` renders inside the form dialog; entered data stays intact.

### Archive / Make Active

Hook used: `usePost(id)` (`setStatus`)

This is not a true delete — it is a PATCH of the post's `active` flag, for several reasons: all information stays in the database for the application's analytics; site owners can see all of their posts, active or inactive; and site owners can create posts that aren't live yet and activate them later.

On `/dashboard` and `/dashboard/post/{id}` every post shows an "active" or "inactive" pill. On `/dashboard/post/{id}`, to the right of the pill, an **Active switch** (the shared `Toggle`, named "Active" for screen readers) reads "inactive" on its left and "active" on its right, and is on when the post is active. The switch follows the post's saved status: it only moves once the request succeeds, and it is disabled while the request is in flight.

- **Switching it off (archive)** sends `{ active: false }` immediately.
- **Switching it on (make active)** sends `{ active: true }` immediately.

There is no confirmation and no success dialog: archiving is reversible with the same switch, so the change is one motion. `ConfirmDialog` is kept for future destructive actions that can't be undone in one step.

Request: `PATCH /api/siteOwner/posts/:id/status` with `{ active: false }` or `{ active: true }`.

- **Failure:** render the backend's `error.message` in a dialog; the switch and the pill stay as they were.
- **Success:** the pill and the switch change to the new status; the site owner stays on `/dashboard/post/{id}`.
