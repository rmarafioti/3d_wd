// Tests for usePosts (site owner): creation only — it fetches nothing on mount.

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePosts } from "./usePosts";
import { mockFetch } from "../../test/helpers";

describe("usePosts", () => {
  it("exposes only create, which POSTs the payload and returns the created Post", async () => {
    const created = { id: "p1", postName: "Walk day" };
    const { calls } = mockFetch({
      "POST /api/siteOwner/posts": { status: 201, body: { data: created } },
    });
    const { result } = renderHook(() => usePosts());
    const payload = {
      websiteId: "w1",
      postName: "Walk day",
      body: "Hi",
      images: [],
      links: [],
    };

    const post = await result.current.create(payload);

    expect(Object.keys(result.current)).toEqual(["create"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual(payload);
    expect(post).toEqual(created);
  });
});
