// Tests for useAccounts: the admin account list, createAccount and linkWebsite, and the
// one-time rule that credentials in a mutation response never land in hook state.

import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAccounts } from "./useAccounts";
import { mockFetch } from "../../test/helpers";

const ACCOUNT = {
  id: "a1",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  role: "site_owner",
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  websites: [],
};
const CREATED = {
  account: ACCOUNT,
  website: {
    id: "w1",
    websiteName: "Stevie The Dog",
    url: "https://www.steviethedog.com",
    active: true,
  },
  credentials: { apiKey: "key_123", webhookSecret: "secret_456" },
};

async function renderLoaded() {
  const hook = renderHook(() => useAccounts());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useAccounts", () => {
  it("createAccount POSTs the payload, returns the response and refetches the list", async () => {
    const { calls } = mockFetch({
      "GET /api/admin/accounts": { body: { data: [] } },
      "POST /api/admin/accounts": { status: 201, body: { data: CREATED } },
    });
    const { result } = await renderLoaded();
    const payload = {
      name: "Richard Marafioti",
      email: "steviethedogchi@gmail.com",
      websiteName: "Stevie The Dog",
      websiteUrl: "https://www.steviethedog.com",
    };

    let response;
    await act(async () => {
      response = await result.current.createAccount(payload);
    });

    expect(calls.find((c) => c.method === "POST").body).toEqual(payload);
    expect(response).toEqual(CREATED);
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "GET")).toHaveLength(2),
    );
  });

  it("never keeps the one-time credentials in data", async () => {
    mockFetch({
      "GET /api/admin/accounts": [
        { body: { data: [] } },
        { body: { data: [ACCOUNT] } },
      ],
      "POST /api/admin/accounts": { status: 201, body: { data: CREATED } },
    });
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.createAccount({
        name: "x",
        email: "x@x.co",
        websiteId: "w1",
      });
    });

    await waitFor(() => expect(result.current.data).toEqual([ACCOUNT]));
    expect(JSON.stringify(result.current)).not.toContain("key_123");
    expect(JSON.stringify(result.current)).not.toContain("secret_456");
  });

  it("linkWebsite POSTs to the account's websites path and refetches the list", async () => {
    const { calls } = mockFetch({
      "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
      "POST /api/admin/accounts/a1/websites": {
        status: 201,
        body: { data: { website: CREATED.website } },
      },
    });
    const { result } = await renderLoaded();

    let response;
    await act(async () => {
      response = await result.current.linkWebsite("a1", { websiteId: "w1" });
    });

    expect(calls.find((c) => c.method === "POST").body).toEqual({
      websiteId: "w1",
    });
    expect(response).toEqual({ website: CREATED.website });
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "GET")).toHaveLength(2),
    );
  });

  it("throws the API error from a failed mutation and doesn't refetch", async () => {
    const { calls } = mockFetch({
      "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
      "POST /api/admin/accounts": {
        status: 409,
        body: {
          error: { message: "An account with this email already exists." },
        },
      },
    });
    const { result } = await renderLoaded();

    await act(async () => {
      await expect(
        result.current.createAccount({
          name: "x",
          email: "x@x.co",
          websiteId: "w1",
        }),
      ).rejects.toMatchObject({
        status: 409,
        message: "An account with this email already exists.",
      });
    });

    expect(calls.filter((c) => c.method === "GET")).toHaveLength(1);
  });
});
