# API

The API contract this frontend codes against. Imported from `CLAUDE.md` via `@docs/api.md`. This is a copy — the source of truth is `docs/endpoints.md` in the backend repo. If the contract changes, update both repos together; never let them drift.

## API Contract

The single agreement between the frontend and backend repos. The backend copy (`backend/docs/endpoints.md`) is the source of truth; the frontend keeps an identical copy in `docs/api.md`. Any change to the contract is made in **both** repos in the same piece of work.

### Conventions

- Every route lives under `/api`.
- All request and response fields are camelCase. snake_case exists only inside the database (Prisma `@map`).
- Dates and times are ISO 8601 strings. `postDate` is a date only: `YYYY-MM-DD`.
- Success response: `{ "data": ... }`
- Error response: `{ "error": { "message": "...", "fields": { "fieldName": "message" } } }` — `fields` is only present on validation errors (400) so the form can show a message next to each field. Each key is the full path to the input, joined with dots: top-level fields use their own name (`email`, `postName`), items in a list use their index (`body.0.text`, `body.1.image.src`, `links.2.url`), and a list-level error such as too many items uses the list name (`body`, `links`).
- Every `POST`, `PATCH` and `DELETE` must carry the header `X-CSRF-Protection: 1`, or the backend returns `403`. `GET` requests do not need it.
- Every request from the app frontend is sent with `credentials: 'include'` (the session cookie). This is handled once, in the frontend's `apiFetch()`.
- `api_key_hash` and `webhook_secret_encrypted` never appear in any response.

### Status codes

| Code | Meaning                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 200  | OK                                                                                           |
| 201  | Created                                                                                      |
| 204  | OK, no body (logout)                                                                         |
| 400  | Invalid input (validation failed, or an image/link id that doesn't belong to the post)       |
| 401  | Not signed in / session expired or invalid / not authorized to log in / bad API key          |
| 403  | Signed in but wrong role, or missing CSRF header                                             |
| 404  | Not found **or not yours** — the same answer either way, so ids can't be probed              |
| 409  | Conflict — duplicate email, duplicate website URL, or account already linked to that website |
| 413  | Request body over the 256 KB limit                                                           |
| 500  | Server error — message is always the generic "Something went wrong, please try again."       |

### Shapes

```
Account        { id, name, email, role, active, createdAt }
WebsiteSummary { id, websiteName, url, active }
Credentials    { apiKey, webhookSecret }            // plaintext, one-time only
Image          { id, src, width, height, altText }
Element        { type: 'paragraph', text } | { type: 'image', image: Image }
Link           { id, name, url }
PostSummary    { id, postName, postDate, active, createdAt }
Post           { id, websiteId, websiteName, postName, header, subHeader,
                 postDate, active, createdAt, updatedAt, body: Element[], links: Link[] }
```

Optional post fields (`header`, `subHeader`, `postDate`) are `null` when empty.

A post's `body` is its content as an ordered list of elements: each element is a paragraph or an image, returned in the order the site owner arranged them, so a client website renders `body` in order to interleave text and photos. Elements have no `id`; they are identified by their position. A paragraph's `text` keeps the line breaks the site owner typed (render it with `white-space: pre-line`). Links are always returned ordered by `id` ascending (UUIDv7 is time-ordered, so this is the order they were added).

### Endpoints

| Method & path                           | Who                                               | Request body                                                                                                                                                                                 | Success                                             |
| --------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `POST /api/auth/login`                  | anyone                                            | `{ credential }` (Google ID token)                                                                                                                                                           | `200 { role }` + sets session cookie                |
| `POST /api/auth/logout`                 | anyone                                            | —                                                                                                                                                                                            | `204`, clears session cookie                        |
| `GET /api/auth/me`                      | signed in                                         | —                                                                                                                                                                                            | `200 { id, name, email, role }`                     |
| `GET /api/admin/accounts`               | admin                                             | —                                                                                                                                                                                            | `200 [ Account + { websites: WebsiteSummary[] } ]`  |
| `GET /api/admin/websites`               | admin                                             | —                                                                                                                                                                                            | `200 WebsiteSummary[]` (active only)                |
| `POST /api/admin/accounts`              | admin                                             | `{ name, email, websiteId }` **or** `{ name, email, websiteName, websiteUrl }`                                                                                                               | `201 { account, website, credentials? }`            |
| `POST /api/admin/accounts/:id/websites` | admin                                             | `{ websiteId }` **or** `{ websiteName, websiteUrl }`                                                                                                                                         | `201 { website, credentials? }`                     |
| `GET /api/siteOwner/websites`           | site owner                                        | —                                                                                                                                                                                            | `200 [ WebsiteSummary + { posts: PostSummary[] } ]` |
| `POST /api/siteOwner/posts`             | site owner                                        | `{ websiteId, postName, header?, subHeader?, postDate?, active?, body: [{ type: 'paragraph', text } \| { type: 'image', image: { src, width, height, altText } }], links: [{ name, url }] }` | `201 Post`                                          |
| `GET /api/siteOwner/posts/:id`          | site owner                                        | —                                                                                                                                                                                            | `200 Post`                                          |
| `PATCH /api/siteOwner/posts/:id`        | site owner                                        | `{ postName, header, subHeader, postDate, body: [{ type: 'paragraph', text } \| { type: 'image', image: { id?, src, width, height, altText } }], links: [{ id?, name, url }] }`              | `200 Post`                                          |
| `PATCH /api/siteOwner/posts/:id/status` | site owner                                        | `{ active }`                                                                                                                                                                                 | `200 Post`                                          |
| `GET /api/public/posts`                 | client website (`Authorization: Bearer <apiKey>`) | —                                                                                                                                                                                            | `200 PublicPost[]`                                  |
| `GET /api/health`                       | anyone                                            | —                                                                                                                                                                                            | `200 { ok: true }`                                  |

Notes:

- `credentials` is only present when a **new** website was created. Its presence is what tells the frontend to open the one-time reveal dialog. When an existing website was linked, it is absent.
- On `POST /api/admin/accounts` and `POST /api/admin/accounts/:id/websites` the body must contain **either** `websiteId` **or** both `websiteName` and `websiteUrl` — never both, never neither (400).
- `PATCH /api/siteOwner/posts/:id` is a full submission of the edit form: all fields are sent every time. Send `null` to clear an optional field. `body` / `links` are the complete current lists, in order — an existing image carries its `image.id`, an existing link its `id`, new ones have none, and any image or link stored but missing from the list is deleted. Paragraphs carry no id. `websiteId` and `active` cannot be changed here.
- `PublicPost` is `{ id, header, subHeader, postDate, createdAt, updatedAt, body: [{ type: 'paragraph', text } | { type: 'image', image: { src, width, height, altText } }], links: [{ name, url }] }` — `postName` is internal and is **never** returned publicly, and neither are image or link ids. Only active posts, newest `createdAt` first.

### Error messages the frontend displays

| Situation                                                               | Code | `error.message`                                                                                                    |
| ----------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| Login: no account, inactive account, unverified or invalid Google token | 401  | You are not authorized to log in.                                                                                  |
| Any session route with no / expired / invalid cookie                    | 401  | Your session expired, please sign in again.                                                                        |
| Wrong role                                                              | 403  | You do not have access to this page.                                                                               |
| Missing CSRF header                                                     | 403  | Request blocked.                                                                                                   |
| Validation failed                                                       | 400  | Please fix the highlighted fields. (+ `fields`)                                                                    |
| Create account: email already exists                                    | 409  | An account with this email already exists.                                                                         |
| New website: URL already exists                                         | 409  | A website with this URL already exists — select it from the dropdown.                                              |
| New website: URL belongs to an inactive website                         | 409  | A website with this URL already exists but is inactive — it's named [Website Name]. Reactivate and then try again. |
| Link: account already linked to that website                            | 409  | This account is already linked to [Website Name].                                                                  |
| Website / account / post not found or not yours                         | 404  | [Website / Account / Post] not found.                                                                              |
| Edit: an image or link id that isn't on this post                       | 400  | Invalid image or link.                                                                                             |
| Public: missing / unknown key, or inactive website                      | 401  | Invalid API key.                                                                                                   |
| Request body over the 256 KB limit                                      | 413  | Request body is too large.                                                                                         |

### Validation rules (identical on frontend and backend)

- Every text field is trimmed first; a field that is blank after trimming counts as empty.
- `name` (account): required, max 100.
- `email`: required, valid email format, stored lowercase.
- `websiteName`: required, max 100.
- `websiteUrl`, link `url`, image `src`: valid URL starting with `https://`. Website URLs are normalized by the backend (lowercase host, no trailing slash) before the uniqueness check and before saving. The uniqueness check treats `www.example.com` and `example.com` as the same website; the URL is stored as entered (it is also the revalidation target).
- `postName`: required, max 100. `header`: optional, max 150. `subHeader`: optional, max 200.
- `postDate`: optional, valid date `YYYY-MM-DD`.
- `body`: a list of elements, each with `type` `paragraph` or `image`. At least 1 paragraph, max 5 paragraphs and max 5 images per post. Paragraph `text`: required, max 10000 (trimmed at the ends; line breaks inside are kept). Image element: `image` required, with `src`, `width`, `height`, `altText` all required; `width`/`height` whole numbers 1–10000; `altText` max 200.
- `links`: max 10 per post. Each link: `name` (max 100) and `url` both required.
- `active` (create / status): boolean.
