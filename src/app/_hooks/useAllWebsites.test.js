// Tests for useAllWebsites (admin): fetches every active website for the WebsitePicker and
// exposes the list-hook shape.

import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAllWebsites } from "./useAllWebsites";
import { mockFetch } from "../../test/helpers";

describe("useAllWebsites", () => {
  it("GETs /api/admin/websites and returns { data, loading, error, refetch }", async () => {
    const websites = [
      {
        id: "w1",
        websiteName: "Stevie The Dog",
        url: "https://www.steviethedog.com",
        active: true,
      },
    ];
    const { calls } = mockFetch({
      "GET /api/admin/websites": { body: { data: websites } },
    });

    const { result } = renderHook(() => useAllWebsites());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls[0].path).toBe("/api/admin/websites");
    expect(Object.keys(result.current).sort()).toEqual([
      "data",
      "error",
      "loading",
      "refetch",
    ]);
    expect(result.current.data).toEqual(websites);
  });
});
