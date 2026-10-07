// Tests for Create an Account (docs/flows.md → Create an Account), run through the real
// useAccounts hook so the request the form sends is checked against docs/api.md: validation
// and Submit gating, both payload shapes, backend errors, and both success dialogs.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateAccountForm from "./CreateAccountForm";
import { useAccounts } from "../_hooks/useAccounts";
import { mockFetch } from "../../test/helpers";

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
};

// The admin page's wiring: the form gets createAccount from the real hook.
function Harness({ onNewWebsite }) {
  const { createAccount } = useAccounts();
  return (
    <CreateAccountForm
      websites={[STEVIE]}
      createAccount={createAccount}
      onNewWebsite={onNewWebsite}
    />
  );
}

function setup(routes) {
  const { calls } = mockFetch({
    "GET /api/admin/accounts": { body: { data: [] } },
    ...routes,
  });
  const onNewWebsite = vi.fn();
  const user = userEvent.setup();
  render(<Harness onNewWebsite={onNewWebsite} />);
  return { user, calls, onNewWebsite };
}

async function fillOwner(user) {
  await user.type(
    screen.getByLabelText("Site Owner Name"),
    "Richard Marafioti",
  );
  await user.type(
    screen.getByLabelText("Site Owner Email"),
    "steviethedogchi@gmail.com",
  );
}

async function fillNewWebsite(user) {
  await user.type(screen.getByLabelText("Website Name"), "Stevie The Dog");
  await user.type(
    screen.getByLabelText("Website URL"),
    "https://www.steviethedog.com",
  );
}

function postBody(calls) {
  return calls.find((call) => call.method === "POST")?.body;
}

describe("CreateAccountForm", () => {
  it("keeps Submit disabled until every required field is filled and valid", async () => {
    const { user } = setup();
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    await fillOwner(user);
    expect(submit).toBeDisabled();
    await fillNewWebsite(user);

    expect(submit).toBeEnabled();
  });

  it("shows the flows.md message for a field once it has been left", async () => {
    const { user } = setup();

    await user.click(screen.getByLabelText("Site Owner Name"));
    await user.tab();
    await user.type(screen.getByLabelText("Site Owner Email"), "rich@");
    await user.tab();

    expect(
      screen.getByText("A site owner name is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A valid email address is required"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A website name is required"),
    ).not.toBeInTheDocument();
  });

  it("sends { name, email, websiteName, websiteUrl } trimmed for a new website", async () => {
    const { user, calls } = setup({
      "POST /api/admin/accounts": {
        status: 201,
        body: { data: { account: ACCOUNT, website: STEVIE } },
      },
    });
    await user.type(
      screen.getByLabelText("Site Owner Name"),
      "  Richard Marafioti ",
    );
    await user.type(
      screen.getByLabelText("Site Owner Email"),
      "steviethedogchi@gmail.com",
    );
    await fillNewWebsite(user);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(postBody(calls)).toEqual({
        name: "Richard Marafioti",
        email: "steviethedogchi@gmail.com",
        websiteName: "Stevie The Dog",
        websiteUrl: "https://www.steviethedog.com",
      }),
    );
  });

  it("sends { name, email, websiteId } for an existing website and confirms with no new credentials", async () => {
    const { user, calls } = setup({
      "POST /api/admin/accounts": {
        status: 201,
        body: { data: { account: ACCOUNT, website: STEVIE } },
      },
    });
    await fillOwner(user);
    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText(
        "Account created and linked to Stevie The Dog. No new API key or webhook secret were generated — the website's existing credentials are unchanged.",
      ),
    ).toBeInTheDocument();
    expect(postBody(calls)).toEqual({
      name: "Richard Marafioti",
      email: "steviethedogchi@gmail.com",
      websiteId: "w1",
    });

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByLabelText("Site Owner Name")).toHaveValue("");
  });

  it("opens the one-time reveal for a new website, then clears the form and refreshes the websites on Close", async () => {
    const { user, onNewWebsite } = setup({
      "POST /api/admin/accounts": {
        status: 201,
        body: {
          data: {
            account: ACCOUNT,
            website: STEVIE,
            credentials: { apiKey: "key_123", webhookSecret: "secret_456" },
          },
        },
      },
    });
    await fillOwner(user);
    await fillNewWebsite(user);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText(
        "Copy these now — they will never be shown again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("key_123")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("key_123")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Site Owner Email")).toHaveValue("");
    expect(onNewWebsite).toHaveBeenCalledOnce();
  });

  it("shows a backend error below Submit and keeps everything typed", async () => {
    const { user } = setup({
      "POST /api/admin/accounts": {
        status: 409,
        body: {
          error: { message: "An account with this email already exists." },
        },
      },
    });
    await fillOwner(user);
    await fillNewWebsite(user);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Site Owner Name")).toHaveValue(
      "Richard Marafioti",
    );
    expect(screen.getByLabelText("Website URL")).toHaveValue(
      "https://www.steviethedog.com",
    );
  });

  it("shows the backend's field messages next to their fields", async () => {
    const { user } = setup({
      "POST /api/admin/accounts": {
        status: 400,
        body: {
          error: {
            message: "Please fix the highlighted fields.",
            fields: { email: "Enter a valid email address." },
          },
        },
      },
    });
    await fillOwner(user);
    await fillNewWebsite(user);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Please fix the highlighted fields.");
    expect(
      screen.getByLabelText("Site Owner Email").nextElementSibling,
    ).toHaveTextContent("Enter a valid email address.");
  });
});
