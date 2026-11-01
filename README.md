# Headless CMS — Frontend

## About the Project

Headless CMS project. Two repos for frontend and backend.

The frontend serves a public, static landing page and sign-in for two separate authenticated dashboards. Two roles to account for, an Administrator and a Site Owner, each with their own dashboard view, auth and API routes. The Administrator uses the frontend to see a summary of site owner accounts and their websites, create new site owner accounts, link websites to them, and read the audit log. The Site Owner uses the frontend to view, create, edit, publish, draft and delete posts.

The backend also serves published post content to each site owner's live website via their API key, and triggers on-demand revalidation on that site by calling its webhook endpoint whenever a post changes.

- Production frontend: `https://3dwebdev.com` (Vercel)
- Production API: `https://api.3dwebdev.com` (Render)
- Staging (follows `main`): `https://staging.3dwebdev.com`, API `https://api-staging.3dwebdev.com`
- Deployment (Vercel, environments, domains): `docs/deploy.md`

## Install List

```
git clone <ssh_key>
npm install
```

Installs:

- Next.js (current stable)
- React
- @react-oauth/google
- Dev tools: Vitest, React Testing Library and jsdom (unit tests), ESLint, Prettier

```
cp .env.example .env
```

Set:

| Variable                          | Local value                                                   | Staging value                      | Production value           |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------------- | -------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | the Google OAuth client id                                    | same                               | same                       |
| `NEXT_PUBLIC_API_BASE_URL`        | leave empty (calls go to `/api` through the dev proxy)        | `https://api-staging.3dwebdev.com` | `https://api.3dwebdev.com` |
| `API_PROXY_TARGET`                | `http://localhost:4000` (where the dev proxy forwards `/api`) | not set                            | not set                    |
| `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL` | the admin's contact email                                     | same                               | same                       |

```
npm run dev           # starts the app on http://localhost:3000
npm test              # runs the unit test suite once, then the guard hook's tests (npm run test:watch to re-run on save)
npm run lint          # ESLint
npm run format        # Prettier (run before every commit)
npm run format:check  # Prettier check only, no changes (what CI runs)
npm run build         # production build
npm run start         # serves the production build (after npm run build)
```

CI (`.github/workflows/ci.yml`) runs lint, `format:check`, a production-dependency `npm audit`, the tests and the build on every pull request and every push to `main`.

Reminders (`.github/workflows/reminders.yml`) open a GitHub issue for the monthly dependency audit (the full `npm audit`, dev included, only when it finds a moderate or worse advisory) and the biweekly code sweep (`/code-sweep`, `.claude/skills/code-sweep/SKILL.md`). See `CLAUDE.md` → Reminders.

The backend must be running locally (see the backend README) for sign-in and the dashboards to work.
