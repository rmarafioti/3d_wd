// @vitest-environment node
// Tests for proxy.js (docs/flows.md → Proxy): a request to / or /sign-in carrying a session cookie
// is redirected to /dashboard; every page gets its Content Security Policy by page type (a fixed
// one for a static page, a fresh nonce for every other page, also set on the request so Next can
// stamp it on its scripts); and the matcher covers pages, not the API, assets or prefetches.
// Runs in Node, where NextRequest lives.

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

const SESSION_PAGES = [
  "/sign-in",
  "/dashboard",
  "/dashboard/post/p1",
  "/admin",
];

function requestFor(path, headers = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function policyOf(path) {
  return proxy(requestFor(path)).headers.get("content-security-policy");
}

function scriptSrc(policy) {
  return policy.split("; ").find((d) => d.startsWith("script-src"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it.each(["/", "/sign-in"])(
    "redirects %s to /dashboard when a session cookie exists",
    (path) => {
      const request = requestFor(path, { cookie: "session=anything" });

      const response = proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/dashboard",
      );
    },
  );

  it("lets the request through when there is no session cookie", () => {
    const request = requestFor("/sign-in", { cookie: "other=1" });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("doesn't redirect a dashboard page that carries a session cookie", () => {
    const request = requestFor("/dashboard", { cookie: "session=anything" });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it.each(SESSION_PAGES)(
    "gives %s a nonce policy with 'strict-dynamic' and no 'unsafe-inline' for scripts",
    (path) => {
      const policy = policyOf(path);

      expect(scriptSrc(policy)).toMatch(
        /^script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'$/,
      );
      expect(policy).toContain("frame-ancestors 'none'");
    },
  );

  it("sets the same policy on the request, so Next can stamp the nonce on its scripts", () => {
    const response = proxy(requestFor("/dashboard"));

    expect(
      response.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(response.headers.get("content-security-policy"));
  });

  it("makes a fresh nonce for every request", () => {
    expect(policyOf("/admin")).not.toBe(policyOf("/admin"));
  });

  it("allows Google sign-in, Cloudinary and picked images on session pages", () => {
    const policy = policyOf("/sign-in");

    expect(policy).toContain("frame-src https://accounts.google.com/gsi/");
    expect(policy).toContain("https://api.cloudinary.com");
    expect(policy).toContain(
      "img-src 'self' data: blob: https://res.cloudinary.com",
    );
  });

  it("gives the static landing page the fixed policy, with no nonce", () => {
    const policy = policyOf("/");

    expect(scriptSrc(policy)).toBe("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("gives a page that isn't listed as static the nonce policy", () => {
    expect(scriptSrc(policyOf("/some-new-page"))).toContain("'nonce-");
  });

  it("adds 'unsafe-eval' in development only", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(scriptSrc(policyOf("/dashboard"))).toContain("'unsafe-eval'");
    expect(scriptSrc(policyOf("/"))).toContain("'unsafe-eval'");
  });

  it("leaves 'unsafe-eval' out in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(policyOf("/dashboard")).not.toContain("'unsafe-eval'");
    expect(policyOf("/")).not.toContain("'unsafe-eval'");
  });

  it.each(["/", ...SESSION_PAGES])("runs on the page %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(["/api/auth/me", "/_next/static/chunks/app.js", "/favicon.ico"])(
    "doesn't run on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );

  it("doesn't run on a prefetch", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/dashboard",
        headers: { "next-router-prefetch": "1" },
      }),
    ).toBe(false);
  });
});
