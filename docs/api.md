# API

The API contract this frontend codes against. Imported from `CLAUDE.md` via `@docs/api.md`. This is a copy — the source of truth is `docs/endpoints.md` in the backend repo. If the contract changes, update both repos together; never let them drift.

## API Contract

The single agreement between the frontend and backend repos. The backend copy (`backend/docs/endpoints.md`) is the source of truth; the frontend keeps an identical copy in `docs/api.md`. Any change to the contract is made in **both** repos in the same piece of work.

### Conventions

- Every route lives under `/api`.
- All request and response fields are camelCase. snake_case exists only inside the database (Prisma `@map`). One exception: `fields` in `UploadSignature` keeps Cloudinary's own form-field names (`api_key`, `timestamp`, …), because the frontend sends it to Cloudinary unchanged.
- Dates and times are ISO 8601 strings. `postDate` is a date only: `YYYY-MM-DD`.
- Success response: `{ "data": ... }`
- Error response: `{ "error": { "message": "...", "fields": { "fieldName": "message" } } }` — `fields` is only present on validation errors (400) so the form can show a message next to each field. Each key is the full path to the input, joined with dots: top-level fields use their own name (`email`, `postName`), items in a list use their index (`body.0.text`, `body.1.image.src`), and a list-level error such as too many items uses the list name (`body`).
- Every `POST`, `PATCH` and `DELETE` must carry the header `X-CSRF-Protection: 1`, or the backend returns `403`. `GET` requests do not need it.
- Every request from the app frontend is sent with `credentials: 'include'` (the session cookie). This is handled once, in the frontend's `apiFetch()`.
- `api_key_hash` and `webhook_secret_encrypted` never appear in any response.

### Status codes

| Code | Meaning                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 200  | OK                                                                                                                                   |
| 201  | Created                                                                                                                              |
| 204  | OK, no body (logout, delete a post or gallery)                                                                                       |
| 400  | Invalid input (validation failed, an image id that doesn't belong to the post or gallery, or an image not uploaded for its website)  |
| 401  | Not signed in / session expired or invalid / not authorized to log in / bad API key                                                  |
| 403  | Signed in but wrong role, or missing CSRF header                                                                                     |
| 404  | Not found **or not yours** — the same answer either way, so ids can't be probed                                                      |
| 409  | Conflict — duplicate email, duplicate website URL, account already linked to that website, or a gallery name the website already has |
| 413  | Request body over the 256 KB limit                                                                                                   |
| 429  | Too many requests: over a rate limit (login, the public API, upload signing)                                                         |
| 500  | Server error — message is always the generic "Something went wrong, please try again."                                               |

### Shapes

```
Account        { id, name, email, role, active, createdAt }
WebsiteSummary { id, websiteName, url, active }
Credentials    { apiKey, webhookSecret }            // plaintext, one-time only
UploadSignature { uploadUrl, fields }               // fields: Cloudinary form fields, posted as-is
Image          { id, src, width, height, altText }
Element        { type: 'paragraph', text } | { type: 'image', image: Image }
PostSummary    { id, postName, postDate, active, status, createdAt }
AuditEvent     { id, action, actorEmail, targetType, targetId, metadata, ip, createdAt }
Post           { id, websiteId, websiteName, postName, header, subHeader,
                 postDate, active, status, createdAt, updatedAt, body: Element[] }
GallerySummary { id, galleryName, slug, status, createdAt }
AdminGallerySummary { id, galleryName, status, imageCount, hasThumbnails, hasMobileCrops }
Crop           { x, y, width, height }              // pixels of the stored image
GalleryImage   { id, src, width, height, altText, caption,
                 thumbnailCrop: Crop | null, mobileCrop: Crop | null }
Gallery        { id, websiteId, websiteName, galleryName, slug, title, copy, status,
                 createdAt, updatedAt, images: GalleryImage[] }
CroppedImage   { src, width, height }
PublicGallery  { id, slug, title, copy, createdAt, updatedAt,
                 images: [{ src, width, height, altText, caption,
                            thumbnail: CroppedImage | null, mobile: CroppedImage | null }] }
```

Optional post fields (`header`, `subHeader`, `postDate`) are `null` when empty. Optional gallery fields (`title`, `copy`, an image's `caption`) are `null` when empty too.

A post's `body` is its content as an ordered list of elements: each element is a paragraph or an image, returned in the order the site owner arranged them, so a client website renders `body` in order to interleave text and photos. Elements have no `id`; they are identified by their position. A paragraph's `text` keeps the line breaks the site owner typed (render it with `white-space: pre-line`). A paragraph's `text` may also contain formatting markup, described in Paragraph formatting below.

### Endpoints

| Method & path                                      | Who                                               | Request body                                                                                                                                                                  | Success                                                                                     |
| -------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`                             | anyone                                            | `{ credential }` (Google ID token)                                                                                                                                            | `200 { role }` + sets session cookie                                                        |
| `POST /api/auth/logout`                            | anyone                                            | —                                                                                                                                                                             | `204`, ends every session of the account                                                    |
| `GET /api/auth/me`                                 | signed in                                         | —                                                                                                                                                                             | `200 { id, name, email, role }`                                                             |
| `GET /api/admin/accounts`                          | admin                                             | —                                                                                                                                                                             | `200 [ Account + { websites: [ WebsiteSummary + { galleries: AdminGallerySummary[] } ] } ]` |
| `GET /api/admin/websites`                          | admin                                             | —                                                                                                                                                                             | `200 WebsiteSummary[]` (active only)                                                        |
| `GET /api/admin/auditEvents?month=&limit=&cursor=` | admin                                             | —                                                                                                                                                                             | `200 { data: AuditEvent[], nextCursor }`                                                    |
| `GET /api/admin/auditEvents/months`                | admin                                             | —                                                                                                                                                                             | `200 string[]` (`YYYY-MM`, newest first)                                                    |
| `POST /api/admin/accounts`                         | admin                                             | `{ name, email, websiteId }` **or** `{ name, email, websiteName, websiteUrl }`                                                                                                | `201 { account, website, credentials? }`                                                    |
| `POST /api/admin/accounts/:id/websites`            | admin                                             | `{ websiteId }` **or** `{ websiteName, websiteUrl }`                                                                                                                          | `201 { website, credentials? }`                                                             |
| `GET /api/siteOwner/websites`                      | site owner                                        | —                                                                                                                                                                             | `200 [ WebsiteSummary + { posts: PostSummary[], galleries: GallerySummary[] } ]`            |
| `POST /api/siteOwner/posts`                        | site owner                                        | `{ websiteId, postName, header?, subHeader?, postDate?, status?, active?, body: [{ type: 'paragraph', text } \| { type: 'image', image: { src, width, height, altText } }] }` | `201 Post`                                                                                  |
| `GET /api/siteOwner/posts/:id`                     | site owner                                        | —                                                                                                                                                                             | `200 Post`                                                                                  |
| `PATCH /api/siteOwner/posts/:id`                   | site owner                                        | `{ postName, header, subHeader, postDate, body: [{ type: 'paragraph', text } \| { type: 'image', image: { id?, src, width, height, altText } }] }`                            | `200 Post`                                                                                  |
| `PATCH /api/siteOwner/posts/:id/status`            | site owner                                        | `{ status }` (or the legacy `{ active }`)                                                                                                                                     | `200 Post`                                                                                  |
| `DELETE /api/siteOwner/posts/:id`                  | site owner                                        | —                                                                                                                                                                             | `204`                                                                                       |
| `POST /api/siteOwner/galleries`                    | site owner                                        | `{ websiteId, galleryName, title?, copy?, status?, images: [{ src, width, height, altText, caption?, thumbnailCrop?, mobileCrop? }] }`                                        | `201 Gallery`                                                                               |
| `GET /api/siteOwner/galleries/:id`                 | site owner                                        | —                                                                                                                                                                             | `200 Gallery`                                                                               |
| `PATCH /api/siteOwner/galleries/:id`               | site owner                                        | `{ galleryName, title, copy, images: [{ id?, src, width, height, altText, caption, thumbnailCrop, mobileCrop }] }`                                                            | `200 Gallery`                                                                               |
| `PATCH /api/siteOwner/galleries/:id/status`        | site owner                                        | `{ status }`                                                                                                                                                                  | `200 Gallery`                                                                               |
| `DELETE /api/siteOwner/galleries/:id`              | site owner                                        | —                                                                                                                                                                             | `204`                                                                                       |
| `POST /api/siteOwner/uploads/sign`                 | site owner                                        | `{ websiteId }`                                                                                                                                                               | `200 UploadSignature`                                                                       |
| `GET /api/public/posts`                            | client website (`Authorization: Bearer <apiKey>`) | —                                                                                                                                                                             | `200 PublicPost[]`                                                                          |
| `GET /api/public/galleries/:slug`                  | client website (`Authorization: Bearer <apiKey>`) | —                                                                                                                                                                             | `200 PublicGallery`                                                                         |
| `GET /api/health`                                  | anyone                                            | —                                                                                                                                                                             | `200 { ok: true }`                                                                          |

Notes:

- `GET /api/admin/accounts` gives each website its galleries that aren't deleted, drafts included, newest first, as `AdminGallerySummary`: the name, status, number of images, and whether every one of its images has a thumbnail crop (`hasThumbnails`) and a mobile crop (`hasMobileCrops`); a flag is `false` when any image lacks that crop, though saves already keep a gallery's crops all or none (Validation rules). Counts and flags only, never images or text, so the administrator can see a gallery was cropped (crops aren't files, so they don't show in Cloudinary). A website with no galleries has `galleries: []`. The other admin routes return the plain `WebsiteSummary`.
- `GET /api/admin/auditEvents` lists one month of audit events, newest first, a page at a time. `month` is `YYYY-MM`, a UTC calendar month, and defaults to the current one. `limit` is 1–100, default 50. `nextCursor` sits beside `data` in the success body: send it as `cursor` to get the next page of the same month; it is `null` on the last page. All three query parameters are optional. `AuditEvent`'s `actorEmail`, `targetType`, `targetId`, `metadata` and `ip` are `null` when the row has none; `metadata` holds only ids and short facts (`{ websiteId }`, or a failed login's `{ reason }`). Read-only: no route edits or deletes an audit event.
- `GET /api/admin/auditEvents/months` lists every UTC month that has at least one audit event, as `YYYY-MM`, newest first, so the page's month controls reach only months with events. An empty log returns `[]`. It is not paginated: there is one item per month, so years of history stay a few dozen strings.
- `credentials` is only present when a **new** website was created. Its presence is what tells the frontend to open the one-time reveal dialog. When an existing website was linked, it is absent.
- On `POST /api/admin/accounts` and `POST /api/admin/accounts/:id/websites` the body must contain **either** `websiteId` **or** both `websiteName` and `websiteUrl` — never both, never neither (400).
- `PATCH /api/siteOwner/posts/:id` is a full submission of the edit form: all fields are sent every time. Send `null` to clear an optional field. `body` is the complete current list, in order. An existing image carries its `image.id`, a new one has none, and any image stored but missing from the body is deleted. Paragraphs carry no id. `websiteId`, `status` and `active` cannot be changed here.
- A post's `status` is `draft` or `published`: a published post shows on the client website, a draft doesn't (the site owner still sees it). It replaces the boolean `active` (`true` is `published`, `false` is `draft`), which is still returned beside it and still accepted in requests until a later release removes it. Send `status`. A request that sends both with values that don't match is `400` on `fields.status`. A new post is `published` unless the request says otherwise.
- `PublicPost` is `{ id, header, subHeader, postDate, createdAt, updatedAt, body: [{ type: 'paragraph', text } | { type: 'image', image: { src, width, height, altText } }] }` — `postName` is internal and is **never** returned publicly, and neither are image ids. Only published posts, newest `createdAt` first.
- `DELETE /api/siteOwner/posts/:id` deletes a post for good, as far as the site owner and the client website can tell: from then on every site owner post route returns `404` "Post not found." for it, `GET /api/siteOwner/websites` leaves it out, and `GET /api/public/posts` never returns it. There is no undelete. A draft is different: it hides a post from the client website while the site owner still sees it and can publish it again.
- Images are uploaded to 3DWD's Cloudinary account from the post form; nobody types or pastes an image URL. A picked image stays in the browser until Publish. On Publish, when the body has new images, the frontend:
  1. shrinks each new image in the browser: decoded with its own orientation (so a photo the phone saved rotated stays upright), scaled so its long side fits 2500 px, never up, and re-encoded, a png as png (keeping its transparency) and a jpg or webp as jpg at 0.85 quality. Every new image is re-encoded, however small, so its metadata, including a phone photo's GPS location, never leaves the browser. If the browser can't decode or encode a file, the file goes up as picked;
  2. requests one `UploadSignature` for the post's website (`POST /api/siteOwner/uploads/sign`);
  3. uploads each new image to `uploadUrl` as `multipart/form-data`: every entry of `fields`, plus the image as `file`. One signature covers every upload in that Publish. It expires after one hour, so it is requested at Publish, never when the form opens;
  4. saves the post with each new image's `src` set to Cloudinary's `secure_url`, and its `width` and `height` from Cloudinary's response.

  If any upload fails, the post is not saved. Before shrinking, the frontend checks that each file as picked is jpg, png or webp and at most 10 MB; Cloudinary also refuses any other format. Cloudinary still scales a larger image down to fit 2500 × 2500 as it stores it (the signed transformation, a safety net for a file that went up as picked), so the `width` and `height` it returns are the stored size.

- A gallery is a section of a client website showing a series of images. A website can have many galleries, each with 1 to 30 images in the order the site owner arranged them. Its images are uploaded exactly as a post's are (the steps above, with the gallery form's Submit in place of Publish), into the same website folder.
- A gallery's `slug` is how the client website asks for it: `GET /api/public/galleries/:slug`. The backend makes it from `galleryName` when the gallery is created (lowercase, a hyphen for each run of other characters: "Our Interior!" → `our-interior`), adds `-2`, `-3`… if the website already has it, and never changes it, so renaming a gallery never breaks the website. The dashboard shows it, so the site owner can say which gallery goes where.
- `galleryName` is internal and is **never** returned publicly, and neither are image ids. A gallery's `status` is `draft` or `published`, like a post's, and a new gallery is `published` unless the request says otherwise.
- `PATCH /api/siteOwner/galleries/:id` is a full submission of the edit form, like a post edit: `images` is the complete current list, in order; an existing image carries its `id`, a new one has none, and any stored image missing from the list is deleted. `websiteId`, `status` and `slug` cannot be changed here.
- `DELETE /api/siteOwner/galleries/:id` works like deleting a post: every site owner gallery route then returns `404` "Gallery not found." for it, `GET /api/siteOwner/websites` leaves it out, and the public route never returns it.
- Crops: each gallery image may have a `thumbnailCrop` (a square) and a `mobileCrop` (at least as tall as it is wide), the part of the image the site owner chose for a thumbnail and for phones. A crop is in the stored image's pixels, the `width` and `height` Cloudinary returned, so a crop picked on a larger file in the browser is scaled to the stored size before it is sent. Send `null` (or leave it out on create) for no crop. A gallery's crops are consistent: every image has a thumbnail crop or none does, every image has a mobile crop or none does, and every mobile crop has the same shape (Validation rules). `PublicGallery` returns each crop as a ready `CroppedImage`, a Cloudinary URL that cuts that rectangle from the stored image, with the crop's own `width` and `height` for `<Image>`; it is `null` when there is no crop, and the client website then shows the full image.

### Error messages the frontend displays

| Situation                                                                                                             | Code | `error.message`                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| Login: no account, inactive account, unverified or invalid Google token                                               | 401  | You are not authorized to log in.                                                                                 |
| Any session route with no / expired / invalid cookie                                                                  | 401  | Your session expired, please sign in again.                                                                       |
| Wrong role                                                                                                            | 403  | You do not have access to this page.                                                                              |
| Missing CSRF header                                                                                                   | 403  | Request blocked.                                                                                                  |
| Validation failed                                                                                                     | 400  | Please fix the highlighted fields. (+ `fields`)                                                                   |
| Create account: email already exists                                                                                  | 409  | An account with this email already exists.                                                                        |
| New website: URL already exists                                                                                       | 409  | A website with this URL already exists. Select it from the dropdown.                                              |
| New website: URL belongs to an inactive website                                                                       | 409  | A website with this URL already exists but is inactive. It's named [Website Name]. Reactivate and then try again. |
| Gallery: another gallery on this website (not deleted) has that name, in any case                                     | 409  | A gallery with this name already exists.                                                                          |
| Link: account already linked to that website                                                                          | 409  | This account is already linked to [Website Name].                                                                 |
| Website / account / post / gallery not found or not yours                                                             | 404  | [Website / Account / Post / Gallery] not found.                                                                   |
| Public: no published gallery with that slug on this website                                                           | 404  | Gallery not found.                                                                                                |
| Create / edit: an image id that isn't on this post or gallery, or an image `src` outside this website's upload folder | 400  | Invalid image.                                                                                                    |
| Public: missing / unknown key, or inactive website                                                                    | 401  | Invalid API key.                                                                                                  |
| Request body over the 256 KB limit                                                                                    | 413  | Request body is too large.                                                                                        |
| Over a rate limit: login, the public API or upload signing                                                            | 429  | Too many requests. Please try again later.                                                                        |

### Validation rules (identical on frontend and backend)

- Every text field is trimmed first; a field that is blank after trimming counts as empty.
- `name` (account): required, max 100.
- `email`: required, valid email format, stored lowercase.
- `websiteName`: required, max 100.
- `websiteUrl`, image `src`: valid URL starting with `https://`. Website URLs are normalized by the backend (lowercase host, no trailing slash) before the uniqueness check and before saving. The uniqueness check treats `www.example.com` and `example.com` as the same website; the URL is stored as entered (it is also the revalidation target).
- Image `src` must also be a Cloudinary `secure_url` in the post's website's upload folder: `https://res.cloudinary.com/<cloud name>/image/upload/v<version>/<folder>/<file name>`, where `<folder>` is the `folder` in that website's `UploadSignature`. Checked on create and edit, for every image, new and existing. A `src` outside the folder is `400` "Invalid image." without `fields`, since the site owner can't fix it in the form.
- `postName`: required, max 100. `header`: optional, max 150. `subHeader`: optional, max 200.
- `postDate`: optional, valid date `YYYY-MM-DD`.
- `body`: a list of elements, each with `type` `paragraph` or `image`. At least 1 paragraph, max 5 paragraphs and max 5 images per post. Paragraph `text`: required, max 10000 (trimmed at the ends; line breaks inside are kept). Image element: `image` required, with `src`, `width`, `height`, `altText` all required; `width`/`height` whole numbers 1–10000; `altText` max 200.
- Paragraph links: every `[text](url)` in a paragraph's `text` (see Paragraph formatting) must have link text (max 100, after trimming) and a valid URL starting with `https://`. A failing link reports on that paragraph's `body.N.text`, with the message for the first failing link in the text (a link's text is checked before its URL).
- `status` (create / status): `draft` or `published` ("Status must be draft or published."). The legacy `active`: a boolean ("Active must be true or false."). When both are sent they must match ("Status and active don't match.", on `status`). On create, both are optional; the status route needs one of them.
- `galleryName`: required, max 100, and unique among the website's galleries that aren't deleted, ignoring case (`409` "A gallery with this name already exists.", on create and edit; a gallery may keep its own name). The frontend checks it first, against the website's `galleries` summaries, and doesn't let the site owner submit a name that's taken; the 409 is the backend's fallback. `title`: optional, max 150. `copy`: optional, max 2000 (line breaks kept, plain text with no formatting markup).
- Gallery `images`: at least 1 ("Add at least one image."), at most 30 ("A gallery can have at most 30 images."), on `images`. Each image: `src`, `width`, `height`, `altText` as for a post image (the same upload folder rule); `caption` optional, max 300.
- Crops: `x` and `y` whole numbers from 0, `width` and `height` whole numbers from 1, and the rectangle inside the image (`x + width` at most the image's `width`, `y + height` at most its `height`). A `thumbnailCrop` must also be square ("Thumbnail crop must be a square inside the image."); a `mobileCrop` must be at least as tall as it is wide ("Mobile crop must be inside the image and at least as tall as it is wide."). The message is on `images.N.thumbnailCrop` or `images.N.mobileCrop` (on one of its numbers, such as `images.N.thumbnailCrop.x`, when that number isn't a whole number in range).
- Crops across a gallery, checked once every image passes its own rules, with the message on `images`: if any image has a `thumbnailCrop`, every image must ("Add a thumbnail crop to every image, or remove them all."); if any image has a `mobileCrop`, every image must ("Add a mobile crop to every image, or remove them all."); and every `mobileCrop`'s width ÷ height must be within 1% of the first one's in list order, which allows for whole-pixel rounding such as 750 × 938 for 4:5 ("Every mobile crop must be the same shape."). When more than one fails, the message is the first of these three.
- Gallery `status` (create / status): `draft` or `published` ("Status must be draft or published."). Optional on create; the status route needs it. Galleries have no `active`.
- Audit events query: `month` matches `YYYY-MM` with a month from 01 to 12 ("Enter a month as YYYY-MM."); `limit` is a whole number from 1 to 100 ("Limit must be a whole number from 1 to 100."); `cursor` is a UUID ("Invalid cursor."). A parameter sent twice fails its rule.

### Paragraph formatting

A paragraph's `text` is stored exactly as the site owner typed it. Four patterns in it are shown formatted; everything else is plain text.

- `**text**` is bold.
- `*text*` is italic.
- `***text***` is bold and italic.
- `[link text](https://…)` is a link.

Rules:

1. Read the text left to right. At each `[`, try a link; at `***`, try bold-italic; at `**`, try bold; at a single `*`, try italic. If the pattern doesn't complete, only its first character shows as typed, and reading continues with the next character (so `**a*` is a `*` followed by italic `a`).
2. A link is `[`, the link text (no `]` and no line break), `](`, the URL (no spaces, no line break and no `)`), then `)`. Because the URL ends at the first `)`, a URL that itself contains `)` can't be linked in v1.
3. Bold-italic ends at the next `***` on the same line, bold at the next `**`, and italic at the next `*`. While looking for the closing marker, a link (rule 2) is skipped whole, so markers inside its text or URL don't close the format. A format applies only when the text between the markers isn't empty and doesn't start or end with a space. Formatting never crosses a line break.
4. Bold, italic and bold-italic may contain links, and nothing else: any other markup inside them shows as typed. Link text is plain: markup inside it shows as typed.
5. `_text_` is not italic. There is one way to write each format.
6. HTML is never stored or rendered. `<`, `>` and `&` in the text show as typed. A renderer builds elements from the text and never sets raw HTML.
7. Bold renders as `<b>`, italic as `<i>`, and bold-italic as `<b><i>…</i></b>`, so one CSS rule styles them the same everywhere. A link renders as `<a>` with its URL as `href`, inside any format around it. A link is built only when its URL starts with `https://`; otherwise its characters show as typed (saving rejects such a link, but the preview shows unsaved text). Whether a link opens in a new tab is up to the renderer.

Line breaks are kept as in any paragraph. The dashboard (post page and preview) and the client website template must render identically, and both test against the examples below. The output column is written as HTML to show the result; renderers build the equivalent elements.

Rendering examples:

| Input                                                     | Output                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Hello **world**`                                         | `Hello <b>world</b>`                                                         |
| `An *easy* walk`                                          | `An <i>easy</i> walk`                                                        |
| `See [our menu](https://example.com/menu).`               | `See <a href="https://example.com/menu">our menu</a>.`                       |
| `**Bold** and *italic* and [a link](https://example.com)` | `<b>Bold</b> and <i>italic</i> and <a href="https://example.com">a link</a>` |
| `5 * 3 * 2`                                               | `5 * 3 * 2`                                                                  |
| `** not bold **`                                          | `** not bold **`                                                             |
| `*open`                                                   | `*open`                                                                      |
| `[no url]`                                                | `[no url]`                                                                   |
| `[menu] (https://example.com)`                            | `[menu] (https://example.com)`                                               |
| `**across` + line break + `lines**`                       | `**across` + line break + `lines**`                                          |
| `_not italic_`                                            | `_not italic_`                                                               |
| `**a *b* c**`                                             | `<b>a *b* c</b>`                                                             |
| `[**Menu**](https://example.com)`                         | `<a href="https://example.com">**Menu**</a>`                                 |
| `<b>hi</b> & more`                                        | `&lt;b&gt;hi&lt;/b&gt; &amp; more` (shown as typed)                          |
| `***both***`                                              | `<b><i>both</i></b>`                                                         |
| `*** spaced ***`                                          | `*** spaced ***`                                                             |
| `**a*`                                                    | `*<i>a</i>`                                                                  |
| `**[our menu](https://example.com/menu)**`                | `<b><a href="https://example.com/menu">our menu</a></b>`                     |
| `*see [the map](https://example.com/map)*`                | `<i>see <a href="https://example.com/map">the map</a></i>`                   |
| `***[both](https://example.com)***`                       | `<b><i><a href="https://example.com">both</a></i></b>`                       |
| `**[a](https://example.com/**x)**`                        | `<b><a href="https://example.com/**x">a</a></b>`                             |
| `[menu](http://example.com)` (preview only)               | `[menu](http://example.com)`                                                 |

Rejected examples (`400` on `body.N.text`):

| Input                                           | Field message                                        |
| ----------------------------------------------- | ---------------------------------------------------- |
| `[menu](http://example.com)`                    | Each link must be a valid URL starting with https:// |
| `[menu](javascript:alert(1))`                   | Each link must be a valid URL starting with https:// |
| `**[menu](http://example.com)**`                | Each link must be a valid URL starting with https:// |
| `[ ](https://example.com)`                      | Each link needs link text.                           |
| `[` + 101 characters + `](https://example.com)` | Link text must be 100 characters or fewer.           |

---
