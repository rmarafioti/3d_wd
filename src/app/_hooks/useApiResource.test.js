// Tests for useApiResource, the fetch logic every data hook shares: the { data, loading, error }
// lifecycle, the 401 rule, refetch keeping data visible, and ignoring stale responses.

import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useApiResource } from "./useApiResource";
import { deferred, mockFetch, stubLocation } from "../../test/helpers";

describe("useApiResource", () => {
  it("starts loading, then holds the response's data", async () => {
    mockFetch({ "GET /api/x": { body: { data: [{ id: "1" }] } } });

    const { result } = renderHook(() => useApiResource("/api/x"));

    expect(result.current).toMatchObject({
      data: null,
      loading: true,
      error: null,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: "1" }]);
    expect(result.current.error).toBeNull();
  });

  it("ends with the API error and loading false when the request fails", async () => {
    mockFetch({
      "GET /api/x": {
        status: 403,
        body: { error: { message: "You do not have access to this page." } },
      },
    });

    const { result } = renderHook(() => useApiResource("/api/x"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error.message).toBe(
      "You do not have access to this page.",
    );
    expect(result.current.data).toBeNull();
  });

  it("stays loading on a 401 while apiFetch redirects to sign-in", async () => {
    const { assign } = stubLocation();
    mockFetch({
      "GET /api/x": {
        status: 401,
        body: {
          error: { message: "Your session expired, please sign in again." },
        },
      },
    });

    const { result } = renderHook(() => useApiResource("/api/x"));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("/sign-in?expired=1"),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("keeps the current data visible while a refetch is in flight", async () => {
    const second = deferred();
    mockFetch({
      "GET /api/x": [{ body: { data: ["first"] } }, () => second.promise],
    });
    const { result } = renderHook(() => useApiResource("/api/x"));
    await waitFor(() => expect(result.current.data).toEqual(["first"]));

    act(() => result.current.refetch());

    expect(result.current).toMatchObject({ data: ["first"], loading: false });
    second.resolve({ body: { data: ["second"] } });
    await waitFor(() => expect(result.current.data).toEqual(["second"]));
  });

  it("clears a previous error once a refetch succeeds", async () => {
    mockFetch({
      "GET /api/x": [
        {
          status: 500,
          body: {
            error: { message: "Something went wrong, please try again." },
          },
        },
        { body: { data: ["ok"] } },
      ],
    });
    const { result } = renderHook(() => useApiResource("/api/x"));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.data).toEqual(["ok"]));
    expect(result.current.error).toBeNull();
  });

  it("ignores a response from an old path once the path has changed", async () => {
    const slow = deferred();
    mockFetch({
      "GET /api/old": () => slow.promise,
      "GET /api/new": { body: { data: "new" } },
    });
    const { result, rerender } = renderHook(
      ({ path }) => useApiResource(path),
      {
        initialProps: { path: "/api/old" },
      },
    );

    rerender({ path: "/api/new" });
    await waitFor(() => expect(result.current.data).toBe("new"));
    slow.resolve({ body: { data: "old" } });
    await act(async () => {
      await slow.promise;
    });

    expect(result.current.data).toBe("new");
  });

  it("lets the caller replace data with setData", async () => {
    mockFetch({ "GET /api/x": { body: { data: { v: 1 } } } });
    const { result } = renderHook(() => useApiResource("/api/x"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setData({ v: 2 }));

    expect(result.current.data).toEqual({ v: 2 });
  });
});
