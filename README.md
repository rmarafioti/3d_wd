# Headless CMS — Frontend

## About the Project

Headless CMS project. Two repos for frontend and backend.

The frontend serves a public, static landing page and sign-in for two separate authenticated dashboards. Two roles to account for, an Administrator and a Site Owner, each with their own dashboard view, auth and API routes. The Administrator uses the frontend to see a summary of site owner accounts and their websites, create new site owner accounts and link websites to them. The Site Owner uses the frontend to view, create, edit, archive and reactivate posts.

The backend also serves published post content to each site owner's live website via their API key, and triggers on-demand revalidation on that site by calling its webhook endpoint whenever a post changes.

- Production frontend: `https://3dwebdev.com` (Vercel)
- Production API: `https://api.3dwebdev.com` (Railway)

## Install List

```
git clone <ssh_key>
npm install
```

Installs:

- Next.js (current stable)
- React
- @react-oauth/google

```
cp .env.example .env
```

Set:

| Variable                          | Local value                                                   | Production value           |
| --------------------------------- | ------------------------------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | the Google OAuth client id                                    | same                       |
| `NEXT_PUBLIC_API_BASE_URL`        | leave empty (calls go to `/api` through the dev proxy)        | `https://api.3dwebdev.com` |
| `API_PROXY_TARGET`                | `http://localhost:4000` (where the dev proxy forwards `/api`) | not set                    |
| `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL` | the admin's contact email                                     | same                       |

```
npm run dev     # starts the app on http://localhost:3000
npm test        # runs the unit test suite once (npm run test:watch to re-run on save)
```

The backend must be running locally (see the backend README) for sign-in and the dashboards to work.
