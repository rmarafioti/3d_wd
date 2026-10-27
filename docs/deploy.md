# Deploy

The frontend's side of deploying the Client Portal. The backend repo's `docs/deploy.md` is the source of truth for the shared decisions (made 2026-10-24) and holds the full Deployment checklist; this file covers only what the frontend does, and uses the backend's step numbers so both read in one order. Rich's master doc copies this file into the Frontend section of its Deployment tab.

## 1. Hosting

The frontend runs on **Vercel, in a Pro team** ($20/month). Vercel's fair use rules limit the Hobby plan to non-commercial use, and client websites pay a hosting fee, so the frontend and every client website project (Stevie The Dog today) move into the Pro team before launch.

For reference (backend side): the API runs on Render, in a Hobby workspace with a Starter web service and the smallest paid Postgres 17 per environment, all defined in the backend's `render.yaml` (a Render Blueprint). Backups are Render's 3 days of point-in-time recovery plus the backend's own nightly encrypted `pg_dump` to Cloudflare R2, kept 30 days. Cloudinary stays on the free tier.

## 2. Environments

| Environment | Frontend                                                      | API                                                                   |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Local       | `http://localhost:3000`                                       | `http://localhost:4000`, through the dev rewrite (`API_PROXY_TARGET`) |
| Staging     | `https://staging.3dwebdev.com` (Vercel, the `staging` branch) | `https://api-staging.3dwebdev.com`                                    |
| Production  | `https://3dwebdev.com` (Vercel, `main`)                       | `https://api.3dwebdev.com`                                            |

- Staging comes first and is tested end to end before production. Production is then added as its own environment in the backend's `render.yaml`, with its own database and secrets.
- `www.3dwebdev.com` redirects to the apex. The frontend is always served from the one origin in the backend's `CORS_ORIGIN` for that environment, or the API refuses its requests.
- **Staging and production share the session cookie** (`session`, `Domain=.3dwebdev.com`). Always test staging in a **separate browser profile**, so a staging sign-in never overwrites a production one. No code change.

## 3. Vercel environment variables

Set per environment in the Vercel project. They must match `.env.example`. The three `NEXT_PUBLIC_*` values are inlined at build time, so they are set before the first build, and changing one needs a redeploy.

| Variable                          | Staging (`staging` branch scope)   | Production                 |
| --------------------------------- | ---------------------------------- | -------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`        | `https://api-staging.3dwebdev.com` | `https://api.3dwebdev.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | the Google OAuth client id         | same                       |
| `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL` | the admin's contact email          | same                       |
| `API_PROXY_TARGET`                | **never set**                      | **never set**              |

- `NEXT_PUBLIC_API_BASE_URL` is the API origin `apiFetch` calls. It is also the API source in the session pages' Content Security Policy `connect-src` (`src/app/_lib/contentSecurityPolicy.js`). If it is missing, every API call goes to the frontend's own origin and fails.
- `API_PROXY_TARGET` is local only. If it is set on Vercel, the dev rewrite in `next.config.mjs` turns on and `/api/*` is proxied through the frontend.

## 4. Domains

DNS is at Namecheap.

- **Production:** `3dwebdev.com` (apex) on the Vercel project's production branch (`main`), with `www.3dwebdev.com` added as a redirect to the apex.
- **Staging:** `staging.3dwebdev.com`, assigned to the `staging` branch.
- Add the records Vercel shows for each domain at Namecheap, then wait for Vercel to verify them and issue the certificates.

## 5. Google OAuth client

In Google Cloud, add `https://staging.3dwebdev.com` and `https://3dwebdev.com` to the OAuth client's authorized JavaScript origins (`http://localhost:3000` is already there). Sign-in fails on an origin that isn't listed.

## 6. Preview deployments

Turn on Vercel's deployment protection for previews. A preview never points at the production API. It couldn't work against it anyway: `*.vercel.app` is neither the API's CORS origin nor on the cookie's domain.

## 7. Header checks

Run them on staging first, then on production (backend `docs/security.md` → Frontend).

1. `curl -I` a static page (`/`) and a dynamic one (`/sign-in`), and check each sends its Content Security Policy (fixed on `/`, with a nonce on `/sign-in` whose `connect-src` includes that environment's API origin, `https://api.cloudinary.com` and Google's `gsi`), `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` and `Cross-Origin-Opener-Policy`. Staging is behind Vercel Deployment Protection, so there a plain `curl` only sees Vercel's 302 to its sign-in page: check them in the browser's DevTools instead, signed in to Vercel (Rich decided 2026-10-27). Network → the document request lists the other headers, but on staging (2026-10-27) it didn't list the Content Security Policy, although both pages enforced it. So check the policy from the Console on each page, loaded from the address bar: `fetch(location.href).then(r => console.log(r.headers.get("content-security-policy")))` prints the header, and `eval("1")` must fail, quoting the page's `script-src`. Vercel's protection bypass secret is never pasted into chat, a commit or a scanner.
2. Scan `/` and `/sign-in` with securityheaders.com and Mozilla HTTP Observatory. Expected flags, all decided: `'unsafe-inline'` scripts on the static landing page, `'unsafe-inline'` styles everywhere, no HSTS `preload`. The scanners can't reach staging through its protection, so they run on production only, at step 26 (Rich decided 2026-10-27); staging and production run the same config.
3. Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Google's recommended value for its sign-in pop-up) to the security headers in `next.config.mjs`, deploy, and re-test Google sign-in. Done on its own branch (`chore/coop-header`), tested on staging 2026-10-27: the admin and the site owner both sign in. Two Console messages during sign-in are expected and harmless: Google's script logs "Cross-Origin-Opener-Policy policy would block the window.postMessage call" ("would block": a report-only rule, not ours, and sign-in completes), and on staging only, Vercel's preview toolbar is refused a `vercel.live` frame by `frame-src` (the policy working; the toolbar isn't on production).
4. On production, decide on HSTS `preload` once every subdomain of `3dwebdev.com` is settled on https. Joining the preload list is hard to undo for the whole domain.

## 8. Every deploy after launch

Merge to `main` through a pull request with CI green (branch protection) → Render deploys the backend once CI has passed on the commit (pre-deploy `prisma migrate deploy`, with the health check `GET /api/health` gating the switch to the new version) → Vercel deploys the frontend. For a contract change, the backend deploys first, then the frontend (`docs/scaling.md` §3).

## 9. The frontend's steps in the Deployment checklist

Numbered as in the backend's `docs/deploy.md` → Deployment checklist; the steps in between are the backend's.

- **2.** This file. Done 2026-10-24.
- **5.** Move the frontend and client website projects into a Vercel Pro team (Rich). Done.
- **6.** Branch protection on `main` in both repos (Rich). Done 2026-10-23.
- **16.** Staging: the `staging.3dwebdev.com` domain on the `staging` branch, the staging env vars, preview protection, and the staging OAuth origin (Rich). Done.
- **17.** The first staging deploy. Done.
- **18.** The staging test, end to end, in a separate browser profile. Done.
- **20.** Staging header checks and `Cross-Origin-Opener-Policy` (section 7). Done 2026-10-27: headers checked in DevTools (the policy from the Console, see section 7), the scanners moved to step 26, and Google sign-in re-tested as the admin and the site owner with the new header.
- **23.** Production: the apex and `www` domains, the production env vars, and the production OAuth origin (Rich).
- **24.** The first production deploy.
- **26.** Production header checks, the scanners moved here from step 20, and the HSTS `preload` decision (section 7).
