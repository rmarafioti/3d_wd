# Deploy

The frontend's side of deploying the Client Portal. The backend repo's `docs/deploy.md` is the source of truth for the shared decisions, and its `docs/launch-record.md` holds the full launch checklist; this file covers only what the frontend does. The frontend's launch steps, as recorded, are in `docs/history.md` → Launch.

## 1. Hosting

The frontend runs on **Vercel, in a Pro team** ($20/month). Vercel's fair use rules limit the Hobby plan to non-commercial use, and client websites pay a hosting fee, so the frontend and every client website project (Stevie The Dog today) move into the Pro team before launch.

For reference (backend side): the API runs on Render, in a Hobby workspace with a Starter web service and the smallest paid Postgres 17 per environment, all defined in the backend's `render.yaml` (a Render Blueprint). Backups are Render's 3 days of point-in-time recovery plus the backend's own nightly encrypted `pg_dump` to Cloudflare R2, kept 30 days. Cloudinary stays on the free tier.

## 2. Environments

| Environment | Frontend                                                   | API                                                                   |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Local       | `http://localhost:3000`                                    | `http://localhost:4000`, through the dev rewrite (`API_PROXY_TARGET`) |
| Staging     | `https://staging.3dwebdev.com` (Vercel, the `main` branch) | `https://api-staging.3dwebdev.com`                                    |
| Production  | `https://3dwebdev.com` (Vercel, the `production` branch)   | `https://api.3dwebdev.com`                                            |

- Staging comes first and is tested end to end before production. Production is then added as its own environment in the backend's `render.yaml`, with its own database and secrets.
- **Releases:** staging deploys every merge to `main`, in both repos (`staging.3dwebdev.com` follows this repo's `main` branch). Production deploys only from each repo's `production` branch, which receives `main` when `npm run release` runs in the backend repo (section 8): the backend first, then the frontend once Render reports the backend live. So a change runs on staging before it reaches production.
- `www.3dwebdev.com` redirects to the apex. The frontend is always served from the one origin in the backend's `CORS_ORIGIN` for that environment, or the API refuses its requests.
- **Staging and production share the session cookie** (`session`, `Domain=.3dwebdev.com`). Always test staging in a **separate browser profile**, so a staging sign-in never overwrites a production one. No code change.

## 3. Vercel environment variables

Set per environment in the Vercel project. They must match `.env.example`. The `NEXT_PUBLIC_*` values are inlined at build time, so they are set before the first build, and changing one needs a redeploy.

| Variable                          | Staging (Preview, `main` branch scope) | Production                               |
| --------------------------------- | -------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`        | `https://api-staging.3dwebdev.com`     | `https://api.3dwebdev.com`               |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | the Google OAuth client id             | same                                     |
| `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL` | the admin's contact email              | same                                     |
| `NEXT_PUBLIC_SENTRY_DSN`          | **never set** (Sentry off)             | the `3dwd-frontend` Sentry project's DSN |
| `API_PROXY_TARGET`                | **never set**                          | **never set**                            |

- `NEXT_PUBLIC_API_BASE_URL` is the API origin `apiFetch` calls. It is also the API source in the session pages' Content Security Policy `connect-src` (`src/app/_lib/contentSecurityPolicy.js`). If it is missing, every API call goes to the frontend's own origin and fails.
- **Each environment's variables are separate entries in Vercel**, added on their own: a variable scoped to Preview does nothing for Production. Staging's Preview variables are scoped to the `main` branch, the branch staging is built from. A production build without them can't sign in (Google answers "Missing required parameter: client_id", Error 400 invalid_request). After adding or changing a variable, Redeploy that environment with the build cache off, since the values are inlined at build time.
- `NEXT_PUBLIC_SENTRY_DSN` turns on Sentry error reports, production only: a frontend Sentry project of its own (`3dwd-frontend`, beside the backend's), on the free plan, whose new-issue alert emails the admin. Unset, Sentry is off and nothing is sent, so staging and local never report. Set, both Content Security Policies add the DSN's origin to `connect-src`. Events are scrubbed in `src/app/_lib/sentry.js` (the page's path only, no query string, cookies, headers, user or breadcrumbs, no tracing or Session Replay), and `apiFetch`'s errors are never sent. In the Sentry project's settings, turn on "Prevent Storing of IP Addresses" and keep the default server-side data scrubbing. After setting it, Redeploy production with the build cache off.
- **Sentry check,** once after the DSN is first set and released: on `https://3dwebdev.com/?x=1`, run `setTimeout(() => { throw new Error("Sentry check") })` in the Console. The event appears in Sentry with the page's path and no query string, cookies, headers or user, and the Console shows no CSP violation. A form error from the API (a validation 400) sends nothing.
- `API_PROXY_TARGET` is local only. If it is set on Vercel, the dev rewrite in `next.config.mjs` turns on and `/api/*` is proxied through the frontend.

## 4. Domains

DNS is at Namecheap.

- **Production:** `3dwebdev.com` (apex) on the Vercel project's Production environment, which tracks the `production` branch (section 8), with `www.3dwebdev.com` added as a redirect to the apex, not the reverse (Vercel's default when an apex is added): check that `curl -I https://www.3dwebdev.com` answers 308 with `location: https://3dwebdev.com/`.
- **Staging:** `staging.3dwebdev.com`, assigned to the `main` branch, so every merge to `main` shows there by itself.
- Add the records Vercel shows for each domain at Namecheap, then wait for Vercel to verify them and issue the certificates.

## 5. Google OAuth client

In Google Cloud, add `https://staging.3dwebdev.com` and `https://3dwebdev.com` to the OAuth client's authorized JavaScript origins (`http://localhost:3000` is already there). Sign-in fails on an origin that isn't listed.

## 6. Preview deployments

Turn on Vercel's deployment protection for previews. A preview never points at the production API. It couldn't work against it anyway: `*.vercel.app` is neither the API's CORS origin nor on the cookie's domain.

## 7. Header checks

Run them on staging first, then on production (backend `docs/security.md` → Frontend).

1. `curl -I` a static page (`/`) and a dynamic one (`/sign-in`), and check each sends its Content Security Policy (fixed on `/`, with a nonce on `/sign-in` whose `connect-src` includes that environment's API origin, `https://api.cloudinary.com`, Google's `gsi` and, on production, Sentry's ingest origin; on production the fixed policy's `connect-src` lists Sentry's ingest origin too), `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` and `Cross-Origin-Opener-Policy`. Staging is behind Vercel Deployment Protection, so there a plain `curl` only sees Vercel's 302 to its sign-in page: check them in the browser's DevTools instead, signed in to Vercel. Network → the document request lists the other headers, but may leave out the Content Security Policy although the page enforces it, so check the policy from the Console on each page, loaded from the address bar: `fetch(location.href).then(r => console.log(r.headers.get("content-security-policy")))` prints the header, and `eval("1")` must fail, quoting the page's `script-src`. Vercel's protection bypass secret is never pasted into chat, a commit or a scanner.
2. Scan `/` and `/sign-in` with securityheaders.com and Mozilla HTTP Observatory. Expected flags, all decided: `'unsafe-inline'` scripts on the static landing page, `'unsafe-inline'` styles everywhere, no HSTS `preload`. The scanners can't reach staging through its protection, so they run on production only; staging and production run the same config. Observatory scans only a host's root page, so it covers `/`; `curl` covers `/sign-in`. securityheaders.com refuses scripted requests, so it is run in the browser.
3. Re-test Google sign-in after a header change. `Cross-Origin-Opener-Policy: same-origin-allow-popups` (`next.config.mjs`) is Google's recommended value for its sign-in pop-up. Two Console messages during sign-in are expected and harmless: Google's script logs "Cross-Origin-Opener-Policy policy would block the window.postMessage call" ("would block": a report-only rule, not ours, and sign-in completes), and on staging only, Vercel's preview toolbar is refused a `vercel.live` frame by `frame-src` (the policy working; the toolbar isn't on production).
4. On production, decide on HSTS `preload` once every subdomain of `3dwebdev.com` is settled on https. Joining the preload list is hard to undo for the whole domain. **Not now.** HSTS already holds for two years with `includeSubDomains`, so preload would only protect a visitor's very first visit, while binding every present and future subdomain to https in every browser, with months to get off the list. Revisit once email and any other service that may want its own subdomain (for example an email provider's click-tracking address) are set up.

## 8. Every deploy after launch

Both repos release production from a `production` branch, so a merge to `main` never goes live on its own, and one command releases both (matching the backend's `docs/deploy.md` → Every deploy after launch):

1. **Merge.** Each PR merges to `main` with CI green (branch protection). Both staging sites deploy by themselves: Vercel builds this repo's `main` at `staging.3dwebdev.com`, and Render deploys the backend's `main` to `https://api-staging.3dwebdev.com`.
2. **Check staging,** in a separate browser profile (section 2).
3. **Release:** Rich runs `npm run release` in the backend repo. It releases the backend first, then pushes this repo's `main` to its `production` branch once the backend is live, and tags each repo that went live (`docs/process.md` → Releases). How the script works is in the backend's `docs/deploy.md` → Every deploy after launch.
4. **Check production** at `https://3dwebdev.com`.

This repo is never pushed to `staging` or `production` by hand. Its `production` branch is protected by a rule with no "Require…" boxes, so force pushes and deletions are blocked; no pull request or status check is required, since the release push happens outside a pull request. Staging is kept; its reassessment is in `CLAUDE.md` → Current progress.
