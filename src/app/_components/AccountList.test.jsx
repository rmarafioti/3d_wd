// Tests for AccountList (docs/flows.md → Get All Accounts): loading, error and empty states,
// each account with its websites and indicators, and "Link a Website" passing the account up.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountList from "./AccountList";

const ACCOUNT = {
  id: "a1",
  name: "Richard Marafioti",
  email: "steviethedogchi@gmail.com",
  active: true,
  websites: [
    {
      id: "w1",
      websiteName: "Stevie The Dog",
      url: "https://www.steviethedog.com",
      active: false,
    },
  ],
};

describe("AccountList", () => {
  it("shows Loading… before the first response", () => {
    render(
      <AccountList accounts={null} loading error={null} onLink={() => {}} />,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the API error message", () => {
    render(
      <AccountList
        accounts={null}
        loading={false}
        error={{ message: "Something went wrong, please try again." }}
        onLink={() => {}}
      />,
    );

    expect(
      screen.getByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
  });

  it("lists each account and its websites with active / inactive indicators", () => {
    render(
      <AccountList
        accounts={[ACCOUNT]}
        loading={false}
        error={null}
        onLink={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Richard Marafioti — steviethedogchi@gmail.com — active",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Stevie The Dog — https://www.steviethedog.com — inactive",
      ),
    ).toBeInTheDocument();
  });

  it('shows "No websites linked." for an account without websites', () => {
    render(
      <AccountList
        accounts={[{ ...ACCOUNT, websites: [] }]}
        loading={false}
        error={null}
        onLink={() => {}}
      />,
    );

    expect(screen.getByText("No websites linked.")).toBeInTheDocument();
  });

  it('passes the account to onLink from its "Link a Website" button', async () => {
    const onLink = vi.fn();
    render(
      <AccountList
        accounts={[ACCOUNT]}
        loading={false}
        error={null}
        onLink={onLink}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Link a Website" }));

    expect(onLink).toHaveBeenCalledWith(ACCOUNT);
  });

  it("keeps showing the list during a refetch", () => {
    render(
      <AccountList
        accounts={[ACCOUNT]}
        loading
        error={null}
        onLink={() => {}}
      />,
    );

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link a Website" }),
    ).toBeInTheDocument();
  });
});
