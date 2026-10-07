// Tests for the admin dashboard's own wiring (docs/flows.md → Link a Website): the dialog opens
// for the clicked account, an existing-website link confirms with that account's name, and a
// new-website link opens the one-time reveal and refreshes the website list on close.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPage from "./page";
import { deferred, mockFetch, pressEscape } from "../../test/helpers";

const STEVIE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
};
const ACCOUNT = {
  id: "a1",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  role: "site_owner",
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  websites: [],
};

async function setup(linkRoute) {
  const { calls } = mockFetch({
    "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
    "GET /api/admin/websites": { body: { data: [STEVIE] } },
    "POST /api/admin/accounts/a1/websites": linkRoute,
  });
  const user = userEvent.setup();
  render(<AdminPage />);
  await user.click(
    await screen.findByRole("button", { name: "Link a Website" }),
  );
  return { user, calls };
}

describe("Admin page", () => {
  it("links an existing website and confirms with the account's name", async () => {
    const { user } = await setup({
      status: 201,
      body: { data: { website: STEVIE } },
    });
    expect(
      screen.getByRole("heading", {
        name: "Link a website to Richard Marafioti",
      }),
    ).toBeInTheDocument();
    const dialog = within(screen.getByRole("dialog"));
    await user.selectOptions(
      dialog.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.click(dialog.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText(
        "Stevie The Dog linked to Richard Marafioti. No new API key or webhook secret were generated — the website's existing credentials are unchanged.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Link a website to Richard Marafioti",
      }),
    ).not.toBeInTheDocument();
  });

  it("opens the one-time reveal for a new website and refreshes the website list on close", async () => {
    const { user, calls } = await setup({
      status: 201,
      body: {
        data: {
          website: {
            id: "w9",
            websiteName: "Good Boys",
            url: "https://goodboys.com",
            active: true,
          },
          credentials: { apiKey: "key_123", webhookSecret: "secret_456" },
        },
      },
    });
    const websiteGets = () =>
      calls.filter((call) => call.path === "/api/admin/websites");
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Website Name"), "Good Boys");
    await user.type(
      dialog.getByLabelText("Website URL"),
      "https://goodboys.com",
    );

    await user.click(dialog.getByRole("button", { name: "Submit" }));
    await screen.findByText("key_123");
    expect(websiteGets()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("key_123")).not.toBeInTheDocument();
    await waitFor(() => expect(websiteGets()).toHaveLength(2));
  });

  it("still reveals the one-time credentials if the link dialog was closed with Esc mid-request", async () => {
    const response = deferred();
    const { user } = await setup(() => response.promise);
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Website Name"), "Good Boys");
    await user.type(
      dialog.getByLabelText("Website URL"),
      "https://goodboys.com",
    );
    await user.click(dialog.getByRole("button", { name: "Submit" }));

    pressEscape(screen.getByRole("dialog"));
    response.resolve({
      status: 201,
      body: {
        data: {
          website: {
            id: "w9",
            websiteName: "Good Boys",
            url: "https://goodboys.com",
            active: true,
          },
          credentials: { apiKey: "key_123", webhookSecret: "secret_456" },
        },
      },
    });

    expect(await screen.findByText("key_123")).toBeInTheDocument();
    expect(
      screen.getByText("Copy these now — they will never be shown again."),
    ).toBeInTheDocument();
  });
});
