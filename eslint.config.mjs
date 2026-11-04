// ESLint config: Next.js's core-web-vitals rules, plus the CLAUDE.md rules a linter can prove
// (Anti-Patterns, Code Style), each message naming its rule. eslint.config.test.mjs proves each fires.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const TEST_FILES = ["**/*.test.js", "**/*.test.jsx", "src/test/**"];

const NO_FETCH = {
  name: "fetch",
  message:
    "Call our API through apiFetch() (CLAUDE.md → Anti-Patterns); only _lib/apiFetch.js and _lib/uploadImages.js call fetch.",
};
const NO_STORAGE = ["localStorage", "sessionStorage"].map((name) => ({
  name,
  message:
    "Nothing is kept in browser storage: never the session, never the one-time credentials (CLAUDE.md → Anti-Patterns).",
}));

const NO_PROPERTIES = [
  ...["window", "globalThis"].map((object) => ({
    object,
    property: "fetch",
    message: NO_FETCH.message,
  })),
  ...["window", "globalThis"].flatMap((object) =>
    NO_STORAGE.map(({ name, message }) => ({
      object,
      property: name,
      message,
    })),
  ),
  {
    object: "document",
    property: "cookie",
    message:
      "The session cookie is httpOnly and never read in JS (CLAUDE.md → Anti-Patterns).",
  },
];

const EM_DASH_MESSAGE =
  "No em dash in user-facing text: use a comma, a full stop or ! (CLAUDE.md → Code Style). Comments may keep one.";

const NO_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      "Never set raw HTML: paragraph markup renders through FormattedText (CLAUDE.md → Paragraph markup).",
  },
  {
    selector: "AssignmentExpression[left.property.name=/^(inner|outer)HTML$/]",
    message:
      "Never set raw HTML (CLAUDE.md → Paragraph markup is read in one place).",
  },
  {
    selector:
      "CallExpression[callee.object.name='Sentry'][callee.property.name=/^(setUser|setExtra|setExtras|setContext|setTag|setTags|addBreadcrumb)$/]",
    message:
      "Never send Sentry anything a user typed or sent (CLAUDE.md → Anti-Patterns).",
  },
  { selector: "Literal[value=/—/]", message: EM_DASH_MESSAGE },
  { selector: "TemplateElement[value.raw=/—/]", message: EM_DASH_MESSAGE },
  { selector: "JSXText[value=/—/]", message: EM_DASH_MESSAGE },
];

const SENTRY_IMPORT = {
  group: ["@sentry/*"],
  message:
    "Sentry is reached only through _lib/sentry.js, which scrubs every event (CLAUDE.md → Anti-Patterns).",
};
const API_FETCH_IMPORT = {
  regex: "(^|/)_lib/apiFetch$",
  message:
    "Data comes through a hook in _hooks/; only SignInForm and AuthButton call apiFetch directly (CLAUDE.md → Data fetching).",
};

function restrictedImports(...patterns) {
  return ["error", { patterns }];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{js,jsx}"],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-globals": ["error", NO_FETCH, ...NO_STORAGE],
      "no-restricted-properties": ["error", ...NO_PROPERTIES],
      "no-restricted-syntax": ["error", ...NO_SYNTAX],
      "no-restricted-imports": restrictedImports(
        SENTRY_IMPORT,
        API_FETCH_IMPORT,
      ),
    },
  },
  {
    // The two files that call fetch: our API, and the image upload to Cloudinary.
    files: ["src/app/_lib/apiFetch.js", "src/app/_lib/uploadImages.js"],
    rules: {
      "no-restricted-globals": ["error", ...NO_STORAGE],
    },
  },
  {
    // Hooks and lib code are where apiFetch is called, plus the two one-shot auth actions.
    files: [
      "src/app/_hooks/**",
      "src/app/_lib/**",
      "src/app/_components/SignInForm.jsx",
      "src/app/_components/AuthButton.jsx",
    ],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": restrictedImports(SENTRY_IMPORT),
    },
  },
  {
    files: ["src/app/_lib/sentry.js"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // The landing page stays a static Server Component that fetches nothing (CLAUDE.md → Anti-Patterns).
    files: ["src/app/page.js"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...NO_SYNTAX,
        {
          selector: "ExpressionStatement[directive='use client']",
          message:
            "The landing page must never become a Client Component (CLAUDE.md → Anti-Patterns).",
        },
      ],
      "no-restricted-imports": restrictedImports(
        SENTRY_IMPORT,
        API_FETCH_IMPORT,
        {
          regex: "(^|/)_(hooks|context)/",
          message:
            "The landing page uses no hook or context: it stays static (CLAUDE.md → Anti-Patterns).",
        },
      ),
    },
  },
]);

export default eslintConfig;
