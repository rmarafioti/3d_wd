// Tests for SiteOwnerDataContext (docs/flows.md → Get All Websites): the dashboard layout stays
// mounted across /dashboard pages, so returning to /dashboard from a post or gallery page fetches
// the websites again, keeping the rows meanwhile; the first page doesn't fetch twice.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import {
  SiteOwnerDataContext,
  SiteOwnerDataProvider,
} from "./SiteOwnerDataContext";
import { mockFetch } from "../../test/helpers";

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
  it("fetches the websites again on returning to /dashboard, and only once on the first page", async () => {
    pathname = "/dashboard/post/p1";
    const { calls } = mockFetch({
      "GET /api/siteOwner/websites": [
        { body: { data: [WEBSITE] } },
        { body: { data: [{ ...WEBSITE, websiteName: "Stevie Renamed" }] } },
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

    expect(await screen.findByText("Stevie Renamed")).toBeInTheDocument();
    expect(calls).toHaveLength(2);
  });
});
