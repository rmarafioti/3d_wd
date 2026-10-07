// Tests for useWebsites (site owner): fetches the owner's websites with post summaries and
// exposes the list-hook shape.

import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWebsites } from "./useWebsites";
import { mockFetch } from "../../test/helpers";

describe("useWebsites", () => {
  it("GETs /api/siteOwner/websites and returns { data, loading, error, refetch }", async () => {
    const websites = [
      {
        id: "w1",
        websiteName: "Stevie The Dog",
        url: "https://www.steviethedog.com",
        active: true,
        posts: [],
      },
    ];
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": { body: { data: websites } },
    });

    const { result } = renderHook(() => useWebsites());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls[0].path).toBe("/api/siteOwner/websites");
    expect(Object.keys(result.current).sort()).toEqual([
      "data",
      "error",
      "loading",
      "refetch",
    ]);
    expect(result.current.data).toEqual(websites);
  });
});
