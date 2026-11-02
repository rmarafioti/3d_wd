// Tests for AccountsAside (docs/flows.md → Admin Dashboard, Link a Website): closed by default and
// toggled open; the Link a Website dialog opens for the clicked account, an existing-website link
// confirms with that account's name, and a new-website link opens the one-time reveal and
// refreshes the website list on close. Switching a requested ability live asks first, then sets
// it live and refetches, sends nothing when cancelled, and shows a failure in a dialog.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDataProvider } from "../_context/AdminDataContext";
import AccountsAside from "./AccountsAside";
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

function renderAside() {
  render(
    <AdminDataProvider>
      <AccountsAside />
    </AdminDataProvider>,
  );
}

// Opens the aside, the account's Websites disclosure and its Link a Website dialog.
async function setup(linkRoute) {
  const { calls } = mockFetch({
    "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
    "GET /api/admin/websites": { body: { data: [STEVIE] } },
    "POST /api/admin/accounts/a1/websites": linkRoute,
  });
  const user = userEvent.setup();
  renderAside();
  await user.click(screen.getByRole("button", { name: "Accounts" }));
  await user.click((await screen.findAllByText("Richard Marafioti"))[0]);
  await user.click(screen.getByText("Websites"));
  await user.click(screen.getByRole("button", { name: "Link a Website" }));
  return { user, calls };
}

describe("AccountsAside", () => {
  it("starts closed, with no accounts shown", async () => {
    const { calls } = mockFetch({
      "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
      "GET /api/admin/websites": { body: { data: [STEVIE] } },
    });

    renderAside();
    // Wait for the accounts to load, so their absence is down to the closed panel.
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(screen.getByRole("button", { name: "Accounts" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryAllByText("Richard Marafioti")).toHaveLength(0);
  });

  it("opens to show the accounts from its toggle", async () => {
    mockFetch({
      "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
      "GET /api/admin/websites": { body: { data: [STEVIE] } },
    });
    const user = userEvent.setup();
    renderAside();
    const toggle = screen.getByRole("button", { name: "Accounts" });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findAllByText("Richard Marafioti")).not.toHaveLength(0);
  });

  it("closes again from the same toggle", async () => {
    mockFetch({
      "GET /api/admin/accounts": { body: { data: [ACCOUNT] } },
      "GET /api/admin/websites": { body: { data: [STEVIE] } },
    });
    const user = userEvent.setup();
    renderAside();
    const toggle = screen.getByRole("button", { name: "Accounts" });
    await user.click(toggle);
    await screen.findAllByText("Richard Marafioti");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByText("Richard Marafioti")).toHaveLength(0);
  });

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
      dialog.getByLabelText("Choose an existing website"),
      "Stevie The Dog",
    );

    await user.click(dialog.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText(
        "Stevie The Dog linked to Richard Marafioti. No new API key or webhook secret was generated. The website's existing credentials are unchanged.",
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
      screen.getByText("Copy these now! They will never be shown again."),
    ).toBeInTheDocument();
  });

  describe("Live switch", () => {
    const REQUESTED = {
      id: "ab2",
      kind: "galleries",
      status: "requested",
      turnedOn: true,
      requestNote: "A Gallery page.",
      requestedAt: "2026-11-02T00:00:00.000Z",
      createdAt: "2026-11-02T00:00:00.000Z",
      updatedAt: "2026-11-02T00:00:00.000Z",
    };
    const withAbility = (ability) => ({
      ...ACCOUNT,
      websites: [{ ...STEVIE, abilities: [ability], posts: [], galleries: [] }],
    });

    // Opens the aside, the account and its Websites disclosure, then switches the ability live.
    async function clickSetLive(routes) {
      const { calls } = mockFetch({
        "GET /api/admin/websites": { body: { data: [STEVIE] } },
        ...routes,
      });
      const user = userEvent.setup();
      renderAside();
      await user.click(screen.getByRole("button", { name: "Accounts" }));
      await user.click((await screen.findAllByText("Richard Marafioti"))[0]);
      await user.click(screen.getByText("Websites"));
      await user.click(
        screen.getByRole("switch", {
          name: "Photo Galleries live for Stevie The Dog",
        }),
      );
      return { user, calls };
    }

    it("asks first, then sets the ability live and refetches the accounts", async () => {
      const { user, calls } = await clickSetLive({
        "GET /api/admin/accounts": [
          { body: { data: [withAbility(REQUESTED)] } },
          { body: { data: [withAbility({ ...REQUESTED, status: "live" })] } },
        ],
        "PATCH /api/admin/abilities/ab2/status": {
          body: { data: { ...REQUESTED, status: "live" } },
        },
      });
      const dialog = screen.getByRole("dialog");

      expect(
        within(dialog).getByText(
          "Set Photo Galleries live for Stevie The Dog? Only do this once it shows on their website and they have approved it.",
        ),
      ).toBeInTheDocument();

      await user.click(
        within(dialog).getByRole("button", { name: "Set live" }),
      );

      expect(await screen.findByText("live")).toBeInTheDocument();
      expect(calls.find((call) => call.method === "PATCH").body).toEqual({
        status: "live",
      });
    });

    it("sends nothing when cancelled", async () => {
      const { user, calls } = await clickSetLive({
        "GET /api/admin/accounts": { body: { data: [withAbility(REQUESTED)] } },
      });

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(0);
    });

    it("shows a failure in a dialog", async () => {
      await clickSetLive({
        "GET /api/admin/accounts": { body: { data: [withAbility(REQUESTED)] } },
        "PATCH /api/admin/abilities/ab2/status": {
          status: 409,
          body: { error: { message: "This ability is already live." } },
        },
      });

      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Set live" }));

      expect(
        await screen.findByText("This ability is already live."),
      ).toBeInTheDocument();
    });
  });
});
