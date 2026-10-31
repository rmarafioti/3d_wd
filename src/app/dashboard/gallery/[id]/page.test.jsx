// Tests for the single gallery page's own wiring (docs/flows.md → Get a Gallery by ID, Edit a
// Gallery, Gallery Draft / Publish, Delete a Gallery): the slug, "None" for empty fields and crops
// and a crop's picture, the 404 view, the Published switch saving straight away through the
// gallery status route, Delete Gallery confirmed then back to /dashboard, and ?edit=1 opening the
// Edit form, which fetches the websites for the names already taken and closes after a save with
// no success dialog.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GalleryPage from "./page";
import { mockFetch } from "../../../../test/helpers";

const router = { push: vi.fn(), replace: vi.fn() };
// The page's query string; a test sets it before rendering.
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "g1" }),
  useSearchParams: () => new URLSearchParams(search),
}));

const GALLERY = {
  id: "g1",
  websiteId: "w1",
  websiteName: "Stevie The Dog",
  galleryName: "Our Interior",
  slug: "our-interior",
  title: null,
  copy: null,
  status: "published",
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
  images: [
    {
      id: "i1",
      src: "https://res.cloudinary.com/demo/one.jpg",
      width: 800,
      height: 600,
      altText: "Stevie",
      caption: null,
      thumbnailCrop: { x: 100, y: 0, width: 600, height: 600 },
      mobileCrop: null,
    },
  ],
};

async function setup(routes, query = "") {
  search = query;
  const { calls } = mockFetch({
    "GET /api/siteOwner/galleries/g1": { body: { data: GALLERY } },
    ...routes,
  });
  const user = userEvent.setup();
  render(<GalleryPage />);
  await screen.findByRole("heading", { name: "Gallery Name: Our Interior" });
  return { user, calls };
}

describe("Gallery page", () => {
  it('shows the slug, "None" for empty fields and crops, and a crop\'s picture', async () => {
    await setup();

    expect(
      screen.getByText("Gallery Code:").nextElementSibling,
    ).toHaveTextContent("our-interior");
    for (const key of ["Title:", "Copy:", "Caption:", "Mobile"]) {
      expect(screen.getByText(key).nextElementSibling).toHaveTextContent(
        /^None$/,
      );
    }
    expect(
      screen.getByRole("img", { name: "Thumbnail crop of Stevie" }),
    ).toBeInTheDocument();
  });

  it('shows "Gallery not found." with a link back to /dashboard on a 404', async () => {
    mockFetch({
      "GET /api/siteOwner/galleries/g1": {
        status: 404,
        body: { error: { message: "Gallery not found." } },
      },
    });

    render(<GalleryPage />);

    expect(await screen.findByText("Gallery not found.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("moves the gallery to draft straight away when the Published switch is turned off", async () => {
    const { user, calls } = await setup({
      "PATCH /api/siteOwner/galleries/g1/status": {
        body: { data: { ...GALLERY, status: "draft" } },
      },
    });

    await user.click(screen.getByRole("switch", { name: "Published" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Published" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
    expect(calls.find((call) => call.method === "PATCH").body).toEqual({
      status: "draft",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes the gallery once it is confirmed and goes back to /dashboard", async () => {
    const { user, calls } = await setup({
      "DELETE /api/siteOwner/galleries/g1": { status: 204 },
    });

    await user.click(screen.getByRole("button", { name: "Delete Gallery" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "Delete Our Interior? It will be removed from your dashboard and your website. This can't be undone.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Gallery" }),
    );

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  });

  it("opens the Edit form from ?edit=1, fetching the websites for the names already taken, then drops ?edit=1", async () => {
    const { calls } = await setup(
      {
        "GET /api/siteOwner/websites": {
          body: { data: [{ id: "w1", posts: [], galleries: [] }] },
        },
      },
      "?edit=1",
    );

    expect(
      screen.getByRole("dialog", { name: "Edit Gallery" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        calls.some((call) => call.path === "/api/siteOwner/websites"),
      ).toBe(true),
    );
    expect(router.replace).toHaveBeenCalledWith("/dashboard/gallery/g1");
  });

  it("fetches no websites while the Edit form is closed", async () => {
    const { calls } = await setup();

    expect(calls.some((call) => call.path === "/api/siteOwner/websites")).toBe(
      false,
    );
  });

  it("closes the form and shows the edit after Edit Gallery succeeds, with no success dialog", async () => {
    const { user } = await setup({
      "GET /api/siteOwner/websites": {
        body: { data: [{ id: "w1", posts: [], galleries: [GALLERY] }] },
      },
      "PATCH /api/siteOwner/galleries/g1": {
        body: { data: { ...GALLERY, galleryName: "Inside" } },
      },
    });
    await user.click(screen.getByRole("button", { name: "Edit Gallery" }));
    await user.click(
      screen.getByRole("button", { name: "Actions for gallery name" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const nameDialog = screen.getByRole("dialog", {
      name: "Edit gallery name",
    });
    await user.clear(within(nameDialog).getByLabelText("Gallery Name"));
    await user.type(
      within(nameDialog).getByLabelText("Gallery Name"),
      "Inside",
    );
    await user.click(within(nameDialog).getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByRole("heading", { name: "Gallery Name: Inside" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
