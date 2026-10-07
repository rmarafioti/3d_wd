// Tests for apiFetch: the request every call sends (credentials, CSRF header, JSON) and how it
// reads every kind of response (docs/api.md → Conventions, Status codes).

import { describe, expect, it, vi } from "vitest";
import { apiFetch } from "./apiFetch";
import { mockFetch, stubLocation } from "../../test/helpers";

const GENERIC_MESSAGE = "Something went wrong, please try again.";

describe("apiFetch", () => {
  it("sends credentials: include and no CSRF header or body on a GET", async () => {
    const { calls } = mockFetch({ "GET /api/auth/me": { body: { data: {} } } });

    await apiFetch("/api/auth/me");

    expect(calls[0].credentials).toBe("include");
    expect(calls[0].headers).toEqual({});
    expect(calls[0].body).toBeUndefined();
  });

  it.each(["POST", "PATCH", "DELETE"])(
    "adds X-CSRF-Protection: 1 on a %s",
    async (method) => {
      const { calls } = mockFetch({
        [`${method} /api/x`]: { body: { data: {} } },
      });

      await apiFetch("/api/x", { method });

      expect(calls[0].headers["X-CSRF-Protection"]).toBe("1");
      expect(calls[0].credentials).toBe("include");
    },
  );

  it("sends the body as JSON with a Content-Type header", async () => {
    const { calls } = mockFetch({ "POST /api/x": { body: { data: {} } } });

    await apiFetch("/api/x", { method: "POST", body: { name: "Stevie" } });

    expect(calls[0].headers["Content-Type"]).toBe("application/json");
    expect(calls[0].body).toEqual({ name: "Stevie" });
  });

  it("prefixes NEXT_PUBLIC_API_BASE_URL when it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.3dwebdev.com");
    vi.resetModules();
    const { apiFetch: apiFetchWithBase } = await import("./apiFetch");
    const { calls } = mockFetch({
      "GET https://api.3dwebdev.com/api/health": {
        body: { data: { ok: true } },
      },
    });

    await apiFetchWithBase("/api/health");

    expect(calls[0].path).toBe("https://api.3dwebdev.com/api/health");
  });

  it("unwraps the data envelope", async () => {
    mockFetch({ "GET /api/x": { body: { data: [{ id: "1" }] } } });

    await expect(apiFetch("/api/x")).resolves.toEqual([{ id: "1" }]);
  });

  it("returns null for a 204 (logout)", async () => {
    mockFetch({ "POST /api/auth/logout": { status: 204 } });

    await expect(
      apiFetch("/api/auth/logout", { method: "POST" }),
    ).resolves.toBeNull();
  });

  it("throws the error envelope's message, status and fields", async () => {
    mockFetch({
      "POST /api/admin/accounts": {
        status: 400,
        body: {
          error: {
            message: "Please fix the highlighted fields.",
            fields: { email: "Enter a valid email address." },
          },
        },
      },
    });

    await expect(
      apiFetch("/api/admin/accounts", { method: "POST", body: {} }),
    ).rejects.toMatchObject({
      message: "Please fix the highlighted fields.",
      status: 400,
      fields: { email: "Enter a valid email address." },
    });
  });

  it("falls back to the generic message when the error body isn't JSON", async () => {
    mockFetch({
      "GET /api/x": { status: 502, body: "<html>Bad Gateway</html>" },
    });

    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      message: GENERIC_MESSAGE,
      status: 502,
    });
  });

  it("throws the generic message with status 0 when the backend can't be reached", async () => {
    mockFetch({ "GET /api/x": { networkError: true } });

    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      message: GENERIC_MESSAGE,
      status: 0,
    });
  });

  it("redirects to /sign-in?expired=1 on a 401 and still throws", async () => {
    const { assign } = stubLocation();
    mockFetch({
      "GET /api/auth/me": {
        status: 401,
        body: {
          error: { message: "Your session expired, please sign in again." },
        },
      },
    });

    await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({
      status: 401,
    });

    expect(assign).toHaveBeenCalledWith("/sign-in?expired=1");
  });

  it("does not redirect on a 401 from the login call", async () => {
    const { assign } = stubLocation();
    mockFetch({
      "POST /api/auth/login": {
        status: 401,
        body: { error: { message: "You are not authorized to log in." } },
      },
    });

    await expect(
      apiFetch("/api/auth/login", {
        method: "POST",
        body: { credential: "t" },
      }),
    ).rejects.toMatchObject({ message: "You are not authorized to log in." });

    expect(assign).not.toHaveBeenCalled();
  });
});
