// Tests for the Send a Notification page, through the real hook and apiFetch: sending an update
// goes to the mailbox, and a 400 field message shows beside its field.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SendNotificationPage from "./page";
import { mockFetch } from "../../../test/helpers";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const SEND = "POST /api/admin/notifications";

const SENT = {
  id: "n1",
  title: "Holiday hours",
  body: "We close **early** today.",
  kind: "general",
  createdAt: "2026-11-06T12:00:00.000Z",
  updatedAt: "2026-11-06T12:00:00.000Z",
  recipientCount: 3,
  readCount: 0,
};

describe("Send a Notification page", () => {
  it("shows only the form, with no list of sent updates", () => {
    render(<SendNotificationPage />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.queryByText("Sent updates")).not.toBeInTheDocument();
  });

  it("sends the trimmed title and body, then goes to the mailbox", async () => {
    const { calls } = mockFetch({
      [SEND]: { status: 201, body: { data: SENT } },
    });
    const user = userEvent.setup();
    render(<SendNotificationPage />);

    await user.type(screen.getByLabelText("Title"), "  Holiday hours ");
    await user.type(screen.getByLabelText("Body"), "We close **early** today.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/messages"),
    );
    expect(calls[0].body).toEqual({
      title: "Holiday hours",
      body: "We close **early** today.",
    });
  });

  it("shows a backend field message beside its field and keeps what was typed", async () => {
    mockFetch({
      [SEND]: {
        status: 400,
        body: {
          error: {
            message: "Please fix the highlighted fields.",
            fields: { title: "Title must be 120 characters or fewer." },
          },
        },
      },
    });
    const user = userEvent.setup();
    render(<SendNotificationPage />);

    await user.type(screen.getByLabelText("Title"), "News");
    await user.type(screen.getByLabelText("Body"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Title must be 120 characters or fewer."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("News");
    expect(router.push).not.toHaveBeenCalled();
  });
});
