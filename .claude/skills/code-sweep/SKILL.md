---
name: code-sweep
description: Read-only code review of the frontend against CLAUDE.md → Code Review → Checklist, reported as findings in its Output format, with a row for the Code Sweep Tracker sheet. `full` reviews the whole Scope, `<sha>` the code changed since that commit, `diff` only the current branch (the per-step self-review).
argument-hint: full | <last swept commit> | diff
disable-model-invocation: true
---

# /code-sweep

The procedure for `CLAUDE.md` → Code Review in this repo (`3d_wd`, the frontend). `CLAUDE.md` holds the rules (the Checklist, Output and Scope); this file holds how to check each one, step by step, so every run is the same. A change to the Checklist, its Scope or this procedure changes both files in the same PR. The backend has its own `/code-sweep` with the same outline; this one is never run against the backend.

Arguments: `$ARGUMENTS`

## 1. Purpose and when

A sweep finds what per-step reviews miss: dead code, style drift, stale comments and docs that no longer match the code, which build up between files because each self-review sees only its own diff. It produces findings; it never fixes them.

Run it:

- **every 2 weeks**, from the "Code sweep" reminder issue (`.github/workflows/reminders.yml`), with the commit the reminder names;
- **once a quarter, in full**: the first sweep in January, April, July and October (the reminder says `/code-sweep full`);
- **`diff` at the end of every piece of work**, as the Workflow Checklist's self-review, mandatory on every code update. Claude reads this file and follows its `diff` mode there, since it can't type the command itself.

Don't run it to fix something, in the middle of other work, or on a branch with uncommitted work you mean to keep separate from the review.

## 2. Arguments

| Argument | Mode        | Files reviewed in steps 1–5 and 8                                                                                            |
| -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `full`   | full        | every file in the Scope                                                                                                      |
| `<sha>`  | incremental | the Scope files changed in `<sha>..origin/main`                                                                              |
| `diff`   | diff        | the Scope files changed in `origin/main...HEAD`, plus uncommitted                                                            |
| none     | —           | ask Rich for the end commit of the last frontend row in the Code Sweep Tracker sheet (or `full`), then stop until he answers |

The first sweep ever is `full`. Steps 6, 7 and 9 always cover the whole repo, whatever the mode: they are cheap, and they catch the drift between files that a diff can't show. In every mode, a changed file also brings in what it duplicates or makes dead elsewhere (a removed export's last caller, a copied helper's original, a CSS class whose last user was removed).

Every run checks fresh: never reuse an earlier run's results, findings or command output, even from the same session.

## 3. Preconditions, checked first

Check each in order. If one fails, stop and tell Rich which, and how to fix it. Never work around it.

1. **Branch.** `full` and `<sha>`: `git fetch origin`, then `git status` shows `main`, up to date with `origin/main`, and a clean working tree. `diff`: a feature branch, not `main`.
2. **The commit** (`<sha>` only): `git cat-file -e <sha>^{commit}` succeeds and `git merge-base --is-ancestor <sha> origin/main` succeeds. Otherwise ask Rich for the right commit.
3. **Dependencies installed:** `node_modules/` exists. If not, ask Rich to run `npm ci`.

No backend, database or dev server is needed: the tests run in jsdom with every request mocked, and step 9 builds the app rather than serving it.

Record the review's end commit now: `git rev-parse --short origin/main` (for `diff`, `git rev-parse --short HEAD`). The tracker row uses it.

## 4. Scope

Covered (kept in step with `CLAUDE.md` → Code Review → Scope):

- `src/`, every `*.test.js` and `*.test.jsx` in it included
- `next.config.mjs`, `eslint.config.mjs`, `vitest.config.mjs`, `jsconfig.json`, `package.json`, `.env.example`, `.prettierrc`, `.prettierignore`
- `.claude/skills/`, `.claude/settings.json`
- `.github/workflows/`, `.github/reminders/`
- `CLAUDE.md`, `docs/`, `README.md`

Copies, checked only for being identical to the backend's (step 6), never reviewed line by line, since a change to them is made in the backend first: `.claude/hooks/` and `docs/api.md`.

Left out: `node_modules/`, `.next/`, `package-lock.json`, `AGENTS.md` (written by `next dev`), `.claude/settings.local.json` (personal), `.env` (never read).

The files for steps 1–5 and 8 (see Arguments):

```
git diff --name-only <sha>..origin/main        # incremental
git diff --name-only origin/main...HEAD        # diff, plus: git status --short
git ls-files                                   # full
```

Keep only the files under the Scope. If the list is empty in incremental or diff mode, steps 1–5 and 8 have nothing to review: say so and run steps 6, 7 and 9.

## 5. Steps

Read each file in the list whole before judging it, test files included: a test file is code, and its names and structure are checked like any other (`CLAUDE.md` → Unit Tests → The pattern every test follows: a header comment, one `describe` per unit, each `it` a true behaviour sentence, Arrange → Act → Assert, queries by role, label or text, the network only through `mockFetch`, no `data-testid`, no CSS selectors, no snapshots, contract messages word for word). In a `full` sweep with too many test files to read whole in one session, read every test file in the folders the other steps raised findings in, check the rest with these greps, and say in What was checked which test files were only grepped:

```
grep -rn -E '^\s*it\(' src --include='*.test.js' --include='*.test.jsx'          # read every name as a sentence
grep -rln -E 'snapshot|data-testid|querySelector' src --include='*.test.js' --include='*.test.jsx'
grep -rLE '^\s*(//|/\*)' src --include='*.test.js' --include='*.test.jsx'        # test files with no comment at all
```

Each step names what counts as a finding; anything else is not one.

Commands: quote globs (`--include='*.jsx'`), since the shell is zsh. zsh doesn't split an unquoted variable into words, so a list of files held in a variable reaches `grep` as one name that doesn't exist: pipe the list through `xargs` instead, as the commands below do. `grep` may be BSD grep or ugrep, so the patterns avoid `\b`. The guard hook reads a command whole, so a `grep` whose search text spells out a forbidden command (a push to `production`, a force push, a `.env` path) is refused like the command itself: search for a shorter, distinctive part of the phrase instead. Glob patterns in this file sit in fenced code blocks, since Prettier rewrites a `*` inside an inline code span.

### Step 1: Style is consistent (Checklist 1)

For each file, against `CLAUDE.md` → Code Style and Anti-Patterns → New styling:

- File shape: header comment → `"use client"` if needed → imports (React, then Next, then local) → module constants (`UPPER_SNAKE`) → exported helpers → the main export. Inside a component: hooks and state → derived values → handlers → JSX.
- Exports: components and pages `export default function Name`; hooks, lib functions and component-adjacent helpers are named exports.
- Functions: declarations for components, handlers and helpers; arrows only inline.
- Naming: `handleX` for component-level event handlers, a plain verb for a function named for its action, `onX` callback props, booleans as questions, the vocabulary of `docs/flows.md` and `docs/api.md`. Components `PascalCase.jsx`, hooks `useX.js`.
- Text input: `(value ?? "").trim()` before an emptiness or length check, through the `_lib/validation.js` helpers where one exists. A bare `.trim()` is fine after an `isBlank` check, or on a field the API always sends as a string.
- No nested ternaries in JSX; early returns over nested `if` / `else`.
- No em dashes in user-facing strings; check each hit inside a string or JSX text:

  ```
  grep -rn '—' src --include='*.js' --include='*.jsx' --exclude='*.test.js' --exclude='*.test.jsx'
  ```

- Styling: CSS Modules in `src/app/_styling/` imported as `styles`; classes only, never ids; camelCase class names; one rule per selector; the one phone breakpoint `@media (max-width: 667px)` at the end of the file; no new colours, fonts, shadows or animation beyond what the modules already use. `globals.css` holds only shared element rules plus `.fieldError` and `.dialogButtons`.

  ```
  grep -rn -E '^\s*#[A-Za-z]' src --include='*.css'                                  # id selectors
  grep -rnE '@media.*(max|min)-width' src --include='*.css' | grep -v 'max-width: 667px'   # another breakpoint
  grep -rln 'style={{' src --include='*.js' --include='*.jsx' --exclude='*.test.jsx'   # inline styles
  ```

  Inline styles are allowed only where `CLAUDE.md` lists them: `white-space: pre-line` in `dashboard/post/[id]/page.js`, `PostPreview.jsx`, `dashboard/gallery/[id]/page.js` and `GalleryPreview.jsx`, and `CropPreview.jsx`'s computed box and image. Any other hit is a finding.

Finding: a file that breaks a written rule, or two files doing the same thing two ways where no rule decides it (a **decision**: the rule gets written first).

### Step 2: No dead code (Checklist 2)

- Each export in a reviewed file has a caller outside its own file: `grep -rlw '<name>' src`. An export used only inside its own file needs no `export`. A caller only in tests counts as dead, unless the export exists for its test (a limit such as `FORM_TIMEOUT_MS`, or a `_lib/` helper tested on its own, such as `isTooLong` or `sameShape`). `src/test/helpers.js` exists for the tests and is exempt. To list the exports that no other file uses:

  ```
  grep -rhoE '^export (async )?(function|const) [A-Za-z0-9_]+' src --include='*.js' --include='*.jsx' --exclude='*.test.*' | awk '{print $NF}' | sort -u | while read n; do [ "$(grep -rlw "$n" src --include='*.js' --include='*.jsx' --exclude='*.test.*' | wc -l)" -le 1 ] && echo "$n: $(grep -rlw "$n" src | tr '\n' ' ')"; done
  ```

- Unused imports and variables: `npm run lint` reports most; read for the rest.
- Unused props: each prop a component destructures is read, and each prop a caller passes is destructured.
- Hook return values no caller reads: for each hook in a reviewed file, each field it returns is read by at least one caller.
- CSS classes: every class defined in a reviewed `*.module.css` is used by a file that imports that module, and every class a file uses exists in the module it imported. A module may be imported under another name than `styles` (`previewStyles`, `galleryStyles`), so match any name ending in `Styles`. This lists each class no importer uses (it reads only classes that start a line; read the module for grouped or nested selectors):

  ```
  for m in src/app/_styling/*.module.css; do b=$(basename $m); grep -oE '^\.[A-Za-z][A-Za-z0-9]*' $m | sed 's/^\.//' | sort -u | while read c; do grep -rl "$b" src --include='*.js' --include='*.jsx' | xargs grep -qE "[sS]tyles\.$c([^A-Za-z0-9_]|\$)" || echo "$b: $c"; done; done
  ```

- Env vars: the names read in code against `.env.example` (`NODE_ENV` is Next's own and expected). A name in `.env.example` nothing reads, or one read but missing from it, is a finding.

  ```
  grep -rhoE 'process\.env\.[A-Z0-9_]+' src next.config.mjs | sort -u
  ```

- Unreachable branches, commented-out code, components or files nothing imports.

Finding: each one, with the decision delete it or find out why it isn't used (a missing wire-up is a **bug**).

### Step 3: Explicit, then DRY (Checklist 3)

Logic appearing a third time, or twice with a real risk of drift: validation rules and messages, dialog behaviour (the Esc and cancel handling, the button rows), fetch handling, payload building, crop math, the upload, the post and gallery forms' shared pieces. Search for the distinctive line of each candidate across `src/`. Finding: the copies, and where the shared piece belongs (`_lib/`, `_hooks/` or `_components/`). Not a finding: an abstraction for a case that doesn't exist yet, or the post and gallery forms staying separate components (`CLAUDE.md` → Create and Edit a Gallery).

### Step 4: Reads top to bottom (Checklist 4)

A helper used far above where it is defined without reason, state declared far from where it's used, a block that depends on something introduced later. Finding: the move that fixes it.

### Step 5: Comments are necessary and true (Checklist 5)

Every comment in a reviewed file, against the code next to it, and each JS / JSX file's header against what the file does now. CSS files need no header comment (`CLAUDE.md` → In-line comments), though a CSS rule whose reason isn't obvious needs its own. Finding: a comment that is untrue, restates the code, or is missing on a JS / JSX file's header or a non-obvious block.

### Step 6: Docs match code — whole repo (Checklist 6)

- **Architecture tree:** every path in `CLAUDE.md` → Project Architecture exists (`git ls-files`), and every tracked file or folder the tree's level of detail would list is in it, with a true description. The `_components/` list matches the components on disk:

  ```
  ls src/app/_components | grep -v '\.test\.' | sed 's/\.jsx$//'
  ```

- **Hooks:** the hook list in `CLAUDE.md` → Patterns and Preferences matches `src/app/_hooks/` (each hook listed exists, each hook file is listed, and each description, return shape and mutation is true of the code).
- **Flows:** the components, hooks and requests `docs/flows.md` names for each flow are the ones the code uses, and its user-facing strings appear word for word in the code. Check the messages in `src/app/_lib/validation.js`, `postFields.js` and `galleryFields.js`, and each message the UI hard-codes (the timeout, the upload failure, the empty states), against `docs/flows.md` and `docs/api.md`.
- **Scripts:** each script in `package.json` is named in `README.md`, `CLAUDE.md` or `docs/`.
- **Env:** `.env.example`, the env table in `README.md` and `docs/deploy.md` §3 name the same variables.
- **Progress:** `CLAUDE.md` → Current progress (Now, Next, Pending notes) is true of `main`.
- **Copies:** when the backend is the sibling folder `../3d_wd_backend`, compare, read-only, against its `origin/main` (after `git -C ../3d_wd_backend fetch origin`):

  ```
  git -C ../3d_wd_backend show origin/main:.claude/hooks/guard.js | diff - .claude/hooks/guard.js
  git -C ../3d_wd_backend show origin/main:.claude/hooks/guard.test.js | diff - .claude/hooks/guard.test.js
  ```

  and `docs/api.md`'s `## API Contract` section against the same section of the backend's `docs/endpoints.md` at `origin/main`, each cut from its `## API Contract` heading to the next `## ` heading (the backend's file goes on with other sections; `<scratchpad>` is the session's scratchpad directory):

  ```
  git -C ../3d_wd_backend show origin/main:docs/endpoints.md | awk '/^## /{f=($0=="## API Contract")} f' > <scratchpad>/contract-backend.md
  awk '/^## /{f=($0=="## API Contract")} f' docs/api.md | diff -B <scratchpad>/contract-backend.md -   # -B: the blank line before the backend's next heading
  ```

  A difference is reported as a **doc** finding for the backend's Documentation Sync (`npm run check:sync` there), never fixed here first. No sibling folder: say so and go on.

Finding: whichever side is wrong. If the spec is right and the code differs, a **bug**; otherwise a **doc**.

### Step 7: Architecture rules still hold — whole repo (Checklist 7)

One check per rule from `CLAUDE.md` (Role Ownership Check Rule, Anti-Patterns, Patterns and Preferences):

- `fetch` only in `_lib/apiFetch.js` (our API) and `_lib/uploadImages.js` (Cloudinary):

  ```
  grep -rnE '(^|[^A-Za-z_])fetch\(' src --include='*.js' --include='*.jsx' --exclude='*.test.js' --exclude='*.test.jsx'
  ```

- No account id sent: no request body or path built from an `accountId` in a site owner flow.
- The session never stored or read in JS:

  ```
  grep -rnE 'localStorage|sessionStorage|document\.cookie' src --exclude='*.test.js' --exclude='*.test.jsx'
  ```

  `proxy.js` only checks that the `session` cookie exists, never decodes it.

- The landing page stays static: `src/app/page.js` has no `"use client"`, no hook and no fetch; `STATIC_PATHS` in `_lib/contentSecurityPolicy.js` lists only pages with no session and no user content; a link from it to a session page is a plain `<a>`.
- Dashboards stay client-side: every page under `src/app/dashboard/` and `src/app/admin/` is a client component, and their `layout.js` files only call `connection()` and render the client layout, with no user data on the server.
- The one-time reveal: credentials are rendered from the raw response in `CredentialRevealModal` and never put in Context, a hook's state or storage; the reveal blocks Esc.
- Every pop-up is a native `<dialog>` opened with `showModal()`: through `useModalDialog` when it opens on mount, or by its own `showModal()` call when it opens on demand (the sign-in dialog), with `DialogCloseButton` except the documented exceptions (`CLAUDE.md` → Every pop-up is a native `<dialog>`), and no outside-click close.
- Every data hook returns `{ data, loading, error }` plus its mutations; list hooks expose `refetch()`; components call no `apiFetch` directly outside `_hooks/` and `_lib/`, except `SignInForm` and `AuthButton` (sign-in and sign-out, `CLAUDE.md` → Data fetching goes through a per-resource custom hook):

  ```
  grep -rln 'apiFetch' src --exclude='*.test.js' --exclude='*.test.jsx'
  ```

- No raw HTML: no `dangerouslySetInnerHTML`; paragraph markup is read only through `_lib/postFormatting.js`.
- Dependencies: `package.json` adds no UI library beyond `react-icons` and `react-easy-crop`.
- Destructive actions (Delete Post, Delete Gallery, cancelling a form with something to lose) go through `ConfirmDialog`; status switches don't, and `Toggle` never flips before the request succeeds.

Finding: each break, as a **bug**.

### Step 8: Every data view handles every state (Checklist 8)

For each page or component in a reviewed file that shows fetched data or submits a form: loading ("Loading…"), error (the API's `error.message`), empty (the empty text `docs/flows.md` gives), and a backend rejection of a form that passed frontend validation (`error.message` under its button, `error.fields` next to their fields), each with a test where `CLAUDE.md` → Unit Tests calls for one. Finding: a missing state or a missing test for one.

### Step 9: Tooling is clean — whole repo (Checklist 9)

Run each and keep its output:

```
npm run lint
npm run format:check
npm audit --omit=dev --audit-level=high
npm test
npm run build
```

Also run the full `npm audit` (dev included) and list moderate or worse advisories; the monthly reminder covers them, so they are reported as **cleanup**, not blocking. Finding: each failure, as a **bug**.

## 6. Hard rules

- Read-only: no edits, no commits, no branches, no `npm audit fix`, no `npm run format`. The sweep's output is its report, and the fixes issue once Rich approves its draft (After).
- Never edit the backend or any other repo; the backend is only read, at its `origin/main`.
- Never read or print `.env` or `.env.*` (`.env.example` is fine).
- Nothing against staging or production, read or write.
- Never comment on, edit or close an issue: Rich closes the reminder. The one issue the sweep opens is the fixes issue, after Rich's yes.
- The guard hook (`.claude/hooks/guard.js`) and `.claude/settings.json` still apply; a refused command is reported, not worked around.

## 7. When a step fails

- `npm test`, `npm run lint`, `npm run format:check` or `npm run build` fails: report each failure as a **bug** finding and go on with the other steps.
- The backend sibling folder is missing for step 6's copies: report it and go on (it is a Documentation Sync matter, not this sweep's).
- A precondition fails (section 3): stop.
- A file in the list was deleted in the range: skip it, but check step 2 for imports, callers and CSS it left behind.

## 8. Output

The `CLAUDE.md` → Code Review → Output format, exactly:

1. **Findings**, most important first (bugs, then decisions, then cleanups, then docs). Each one:
   - **file:line**
   - **Checklist item** (1–9)
   - **What's wrong**
   - **Proposed fix** (none for a **decision**)
   - **Type:** bug, cleanup, doc or decision
   - For a **decision**: the question for Rich.
2. **What was checked:** the mode, the commit range, the number of files reviewed in steps 1–5 and 8, each step's result in one line, and the test files only grepped (if any). A sweep with no findings still reports this.
3. **The tracker row**, for `full`, `<sha>` and `diff` alike (`diff` only when Rich asks for it to be tracked), tab-separated in a code block so it pastes into the four columns of the Code Sweep Tracker sheet:

```
frontend	<YYYY-MM-DD>	<range>	<N>: <type> <item> <file:line>; <type> <item> <file:line>; …
```

`<range>` is `<sha>..<end>` (incremental), `full@<end>` (full) or `<branch>@<end>` (diff), with 7-character commits. `<N>` is the number of findings; `0` when none.

## 9. After

- Rich decides each finding: fix it, leave it, or (for a **decision**) the rule to write.
- **The fixes issue** (`full` and `<sha>` only): once every finding is decided, offer to open one GitHub issue in this repo that folds all the fixes together, so one branch and one PR carry them. A finding big enough to need its own plan (a contract change, a security fix, anything that touches both repos) gets its own issue and branch instead. Draft it in the session first, then open it with `gh issue create` only once Rich says yes:
  - **Title:** `Code sweep fixes, <YYYY-MM-DD>` (or the one finding's own title).
  - **Body:** a link to the reminder issue (`#<n>`), the sweep's commit range, then each fix to make, grouped by type (bug, cleanup, doc), with its file:line, what's wrong and the fix Rich agreed. Each decision Rich made is written in as a rule to add (for example, to `CLAUDE.md` → Code Style). Findings Rich chose to leave are listed under "Left as is" with his reason, so the next sweep can tell they were seen. End with a "done when" checklist.
  - `gh` signs in as Rich, so the issue shows him as its author, and the Issue Workflow treats his issues as instructions: that is why it is only opened once he has read the draft.
  - In `diff` mode there is no fixes issue: the findings are fixed on the branch being reviewed, once Rich answers (Workflow Checklist).
- Rich pastes the tracker row into the Code Sweep Tracker sheet. Its end commit is where the next incremental sweep starts.
- Rich closes the reminder issue once the findings are settled.
- Every few sweeps, Rich and Claude read the sheet for a checklist item that keeps producing findings, and propose a change to `CLAUDE.md` → Code Review or this file so it stops recurring. That change goes through a PR. The aim is fewer findings per sweep over time.

## 10. Done when

- [ ] Every precondition checked, and the end commit recorded
- [ ] The file list built for the mode
- [ ] Steps 1–9 each run, with steps 6, 7 and 9 over the whole repo
- [ ] Findings reported in the Output format, with a question for each decision
- [ ] What was checked reported, even with no findings
- [ ] The tracker row printed
- [ ] Every finding decided, and the fixes issue drafted and, on Rich's yes, opened
