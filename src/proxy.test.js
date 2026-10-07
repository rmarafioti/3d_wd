// @vitest-environment node
// Tests for proxy.js (docs/flows.md → Proxy): a request carrying a session cookie is redirected
// to /dashboard; one without passes through. Runs in Node, where NextRequest lives.

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

describe("proxy", () => {
  it.each(["/", "/sign-in"])(
    "redirects %s to /dashboard when a session cookie exists",
    (path) => {
      const request = new NextRequest(`http://localhost:3000${path}`, {
        headers: { cookie: "session=anything" },
      });

      const response = proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/dashboard",
      );
    },
  );

  it("lets the request through when there is no session cookie", () => {
    const request = new NextRequest("http://localhost:3000/sign-in", {
      headers: { cookie: "other=1" },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("only runs on / and /sign-in", () => {
    expect(config.matcher).toEqual(["/", "/sign-in"]);
  });
});
