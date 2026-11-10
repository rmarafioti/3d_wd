// Tests for SiteOwnerDataContext: returning to /dashboard from another page refetches the websites,
// keeping the rows meanwhile, and the first page doesn't fetch twice.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useContext } from "react";
import {
  SiteOwnerDataContext,
  SiteOwnerDataProvider,
} from "./SiteOwnerDataContext";
import { deferred, mockFetch } from "../../test/helpers";

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const WEBSITE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
  abilities: [],
  posts: [],
  galleries: [],
};

function WebsiteNames() {
  const { data } = useContext(SiteOwnerDataContext);
  return <p>{data?.map((website) => website.websiteName).join(", ")}</p>;
}

function renderProvider() {
  return render(
    <SiteOwnerDataProvider>
      <WebsiteNames />
    </SiteOwnerDataProvider>,
  );
}

describe("SiteOwnerDataProvider", () => {
  it("fetches the websites again on returning to /dashboard, keeping the rows meanwhile, and only once on the first page", async () => {
    pathname = "/dashboard/post/p1";
    // The refetch is held back, so the test can see the rows kept meanwhile.
    const refetched = deferred();
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [WEBSITE] } },
        () => refetched.promise,
      ],
    });
    const { rerender } = renderProvider();
    await screen.findByText("Stevie The Dog");

    expect(calls).toHaveLength(1);

    pathname = "/dashboard";
    rerender(
      <SiteOwnerDataProvider>
        <WebsiteNames />
      </SiteOwnerDataProvider>,
    );

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(screen.getByText("Stevie The Dog")).toBeInTheDocument();
    refetched.resolve({
      body: { data: [{ ...WEBSITE, websiteName: "Stevie Renamed" }] },
    });
    expect(await screen.findByText("Stevie Renamed")).toBeInTheDocument();
  });
});
