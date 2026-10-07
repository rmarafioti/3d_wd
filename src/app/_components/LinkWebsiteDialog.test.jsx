// Tests for LinkWebsiteDialog (docs/flows.md → Link a Website), run through the real
// useAccounts hook: the request path and body, that an error keeps the picker, and Close.
// The title is covered by the admin page tests.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkWebsiteDialog from "./LinkWebsiteDialog";
import { useAccounts } from "../_hooks/useAccounts";
import { mockFetch } from "../../test/helpers";

const ACCOUNT = { id: "a1", name: "Richard Marafioti" };
const STEVIE = {
  id: "w1",
  websiteName: "Stevie The Dog",
  url: "https://www.steviethedog.com",
  active: true,
};

function Harness({ onSuccess, onClose }) {
  const { linkWebsite } = useAccounts();
  return (
    <LinkWebsiteDialog
      account={ACCOUNT}
      websites={[STEVIE]}
      linkWebsite={linkWebsite}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
}

function setup(postRoute) {
  const { calls } = mockFetch({
    "GET /api/admin/accounts": { body: { data: [] } },
    "POST /api/admin/accounts/a1/websites": postRoute,
  });
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSuccess={onSuccess} onClose={onClose} />);
  return { user, calls, onSuccess, onClose };
}

describe("LinkWebsiteDialog", () => {
  it("POSTs { websiteId } to the account's websites path and hands the response to onSuccess", async () => {
    const response = { website: STEVIE };
    const { user, calls, onSuccess } = setup({
      status: 201,
      body: { data: response },
    });
    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(response));
    expect(calls.find((call) => call.method === "POST").body).toEqual({
      websiteId: "w1",
    });
  });

  it("shows the backend error below Submit and keeps the picked website", async () => {
    const { user, onSuccess } = setup({
      status: 409,
      body: {
        error: { message: "This account is already linked to Stevie The Dog." },
      },
    });
    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText(
        "This account is already linked to Stevie The Dog.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Website Name")).toHaveValue("Stevie The Dog");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls onClose from its Close button", async () => {
    const { user, onClose } = setup({ body: { data: {} } });

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
