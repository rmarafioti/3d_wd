// Tests for usePost(id): fetching one post, update (full-form PATCH) and setStatus (archive /
// make active), and that both mutations show the server's returned Post.

import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePost } from "./usePost";
import { mockFetch } from "../../test/helpers";

const POST = {
  id: "p1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  postName: "Walk day",
  header: null,
  subHeader: null,
  body: "We went for a walk.",
  postDate: null,
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  images: [],
  links: [],
};

async function renderLoaded(id = "p1") {
  const hook = renderHook(() => usePost(id));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("usePost", () => {
  it("returns { data, loading, error, update, setStatus } for the post", async () => {
    mockFetch({ "GET /api/siteOwner/posts/p1": { body: { data: POST } } });

    const { result } = await renderLoaded();

    expect(Object.keys(result.current).sort()).toEqual(
      ["data", "error", "loading", "setStatus", "update"].sort(),
    );
    expect(result.current.data).toEqual(POST);
  });

  it("URL-encodes the id", async () => {
    const { calls } = mockFetch({
      "GET /api/siteOwner/posts/a%2Fb": { body: { data: POST } },
    });

    await renderLoaded("a/b");

    expect(calls[0].path).toBe("/api/siteOwner/posts/a%2Fb");
  });

  it("shows the API's 404 message for a post that isn't found or isn't yours", async () => {
    mockFetch({
      "GET /api/siteOwner/posts/p1": {
        status: 404,
        body: { error: { message: "Post not found." } },
      },
    });

    const { result } = await renderLoaded();

    expect(result.current.error).toMatchObject({
      status: 404,
      message: "Post not found.",
    });
  });

  it("update PATCHes the full form and replaces data with the returned Post", async () => {
    const edited = { ...POST, postName: "Beach day" };
    const form = {
      postName: "Beach day",
      body: POST.body,
      header: null,
      subHeader: null,
      postDate: null,
      images: [],
      links: [],
    };
    const { calls } = mockFetch({
      "GET /api/siteOwner/posts/p1": { body: { data: POST } },
      "PATCH /api/siteOwner/posts/p1": { body: { data: edited } },
    });
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.update(form);
    });

    expect(calls.find((c) => c.method === "PATCH").body).toEqual(form);
    expect(result.current.data).toEqual(edited);
  });

  it("setStatus PATCHes { active } to the status path and replaces data", async () => {
    const archived = { ...POST, active: false };
    const { calls } = mockFetch({
      "GET /api/siteOwner/posts/p1": { body: { data: POST } },
      "PATCH /api/siteOwner/posts/p1/status": { body: { data: archived } },
    });
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.setStatus(false);
    });

    expect(calls.find((c) => c.method === "PATCH").body).toEqual({
      active: false,
    });
    expect(result.current.data).toEqual(archived);
  });

  it("keeps the current post when a mutation fails", async () => {
    mockFetch({
      "GET /api/siteOwner/posts/p1": { body: { data: POST } },
      "PATCH /api/siteOwner/posts/p1/status": {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    const { result } = await renderLoaded();

    await act(async () => {
      await expect(result.current.setStatus(false)).rejects.toMatchObject({
        status: 500,
      });
    });

    expect(result.current.data).toEqual(POST);
  });
});
