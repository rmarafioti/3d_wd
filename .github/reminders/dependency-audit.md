The monthly dependency audit found advisories. It runs the full `npm audit`, dev dependencies included, and reports moderate, high and critical. CI only fails on high advisories in production dependencies (`npm audit --omit=dev --audit-level=high`), so these would otherwise go unseen.

## What to do

1. Open a session in this repo and read this issue (`CLAUDE.md` → Issue Workflow).
2. On a branch: `npm audit fix` (never `--force` without a plan), then `npm test` and `npm run build`. A package that needs a major upgrade gets its own plan.
3. An advisory that can't be fixed yet (no fix available, or the fix breaks something) is written in `CLAUDE.md` → Current progress as accepted, with the reason, in that branch's row.
4. Close this issue once the PR merges or each advisory is accepted.
