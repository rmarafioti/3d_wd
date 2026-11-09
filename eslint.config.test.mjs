// @vitest-environment node
// Tests for eslint.config.mjs's own rules: each fires on a violation and stays quiet where allowed.

import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function ruleIds(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

describe("eslint.config.mjs", () => {
  it("refuses fetch outside apiFetch.js and uploadImages.js", async () => {
    const code = "export function load() { return fetch('/api/x'); }\n";

    const inComponent = await ruleIds(code, "src/app/_components/Load.jsx");
    const inApiFetch = await ruleIds(code, "src/app/_lib/apiFetch.js");
    const inUpload = await ruleIds(code, "src/app/_lib/uploadImages.js");

    expect(inComponent).toContain("no-restricted-globals");
    expect(inApiFetch).toEqual([]);
    expect(inUpload).toEqual([]);
  });

  it("refuses window.fetch, browser storage and document.cookie", async () => {
    const code = [
      "window.fetch('/api/x');",
      "localStorage.setItem('a', 'b');",
      "window.sessionStorage.clear();",
      "export const c = document.cookie;",
      "",
    ].join("\n");

    const ids = await ruleIds(code, "src/app/_lib/apiFetch.js");

    expect(ids).toEqual([
      "no-restricted-properties",
      "no-restricted-globals",
      "no-restricted-properties",
      "no-restricted-properties",
    ]);
  });

  it("refuses raw HTML", async () => {
    const jsx =
      "export default function A({ html }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\n";
    const assign = "export function set(el, html) { el.innerHTML = html; }\n";

    const jsxIds = await ruleIds(jsx, "src/app/_components/A.jsx");
    const assignIds = await ruleIds(assign, "src/app/_lib/dom.js");

    expect(jsxIds).toContain("no-restricted-syntax");
    expect(assignIds).toContain("no-restricted-syntax");
  });

  it("refuses Sentry user data and imports of Sentry outside sentry.js", async () => {
    const setUser = [
      'import * as Sentry from "@sentry/browser";',
      "Sentry.setUser({ id: 1 });",
      "",
    ].join("\n");
    const capture = [
      'import * as Sentry from "@sentry/browser";',
      "export function report(e) { Sentry.captureException(e); }",
      "",
    ].join("\n");

    const outside = await ruleIds(capture, "src/app/_components/Report.jsx");
    const inSentrySetUser = await ruleIds(setUser, "src/app/_lib/sentry.js");
    const inSentryCapture = await ruleIds(capture, "src/app/_lib/sentry.js");

    expect(outside).toEqual(["no-restricted-imports"]);
    expect(inSentrySetUser).toEqual(["no-restricted-syntax"]);
    expect(inSentryCapture).toEqual([]);
  });

  it("refuses an em dash in a string, a template or JSX text, but not in a comment", async () => {
    const code = [
      "// A comment may hold one — like this.",
      'export const a = "one — two";',
      "export const b = `one — ${a}`;",
      "export default function C() { return <p>one — two</p>; }",
      "",
    ].join("\n");

    const ids = await ruleIds(code, "src/app/_components/C.jsx");

    expect(ids).toEqual([
      "no-restricted-syntax",
      "no-restricted-syntax",
      "no-restricted-syntax",
    ]);
  });

  it("allows apiFetch only in hooks, lib code, SignInForm and AuthButton", async () => {
    const code = [
      'import { apiFetch } from "../_lib/apiFetch";',
      "export const load = () => apiFetch('/api/x');",
      "",
    ].join("\n");

    const inComponent = await ruleIds(code, "src/app/_components/Load.jsx");
    const inLayout = await ruleIds(code, "src/app/_layout/Shell.jsx");
    const inHook = await ruleIds(code, "src/app/_hooks/useLoad.js");
    const inSignIn = await ruleIds(
      code,
      "src/app/_components/auth/SignInForm.jsx",
    );
    const inAuthButton = await ruleIds(
      code,
      "src/app/_components/auth/AuthButton.jsx",
    );

    expect(inComponent).toEqual(["no-restricted-imports"]);
    expect(inLayout).toEqual(["no-restricted-imports"]);
    expect(inHook).toEqual([]);
    expect(inSignIn).toEqual([]);
    expect(inAuthButton).toEqual([]);
  });

  it("keeps the landing page a static Server Component", async () => {
    const client = [
      '"use client";',
      "export default function Home() { return <p>Hi</p>; }",
      "",
    ].join("\n");
    const hook = [
      'import { useAuth } from "./_hooks/useAuth";',
      "export default function Home() { useAuth(); return <p>Hi</p>; }",
      "",
    ].join("\n");
    const plain = "export default function Home() { return <p>Hi</p>; }\n";

    const clientIds = await ruleIds(client, "src/app/page.js");
    const hookIds = await ruleIds(hook, "src/app/page.js");
    const plainIds = await ruleIds(plain, "src/app/page.js");

    expect(clientIds).toEqual(["no-restricted-syntax"]);
    expect(hookIds).toEqual(["no-restricted-imports"]);
    expect(plainIds).toEqual([]);
  });

  it("leaves test files free to stub fetch and storage", async () => {
    const code =
      "localStorage.clear();\nexport const f = () => fetch('/api/x');\n";

    const ids = await ruleIds(code, "src/app/_components/Load.test.jsx");

    expect(ids).toEqual([]);
  });
});
