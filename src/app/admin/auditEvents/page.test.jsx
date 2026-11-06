// Tests for the Audit Events page, through the real hooks and apiFetch: the month controls, the
// date field, the table, Load more, every state and "Hide my sign-ins".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditEventsPage from "./page";
import { AuthContext } from "../../_context/AuthContext";
import { deferred, mockFetch } from "../../../test/helpers";

const ADMIN = {
  id: "u1",
  name: "Rich",
  email: "rich@example.com",
  role: "admin",
};
const OCTOBER = "GET /api/admin/auditEvents?month=2026-10";
const SEPTEMBER = "GET /api/admin/auditEvents?month=2026-09";
const MONTHS = "GET /api/admin/auditEvents/months";
// October 14 in the test machine's own time zone: its local midnight to the next, as instants.
const OCTOBER_14_PATH = `/api/admin/auditEvents?from=${encodeURIComponent(
  new Date(2026, 9, 14).toISOString(),
)}&to=${encodeURIComponent(new Date(2026, 9, 15).toISOString())}`;
const OCTOBER_14 = `GET ${OCTOBER_14_PATH}`;

function auditEvent(id, overrides = {}) {
  return {
    id,
    action: "post.created",
    actorEmail: "steviethedogchi@gmail.com",
    targetType: "post",
    targetId: `p${id}`,
    metadata: { websiteId: "w1" },
    ip: "203.0.113.7",
    createdAt: "2026-10-14T15:30:00.000Z",
    ...overrides,
  };
}

function page(data, nextCursor = null, pages = 1) {
  return { body: { data, nextCursor, pages } };
}

// mockFetch with the months list in front of the routes (October alone unless a test says
// otherwise). Returns the paths of the month requests only, in order.
function mockAuditFetch(routes, months = ["2026-10"]) {
  const { calls } = mockFetch({
    [MONTHS]: { body: { data: months } },
    ...routes,
  });
  return {
    eventPaths: () =>
      calls.map((call) => call.path).filter((path) => path.includes("?")),
  };
}

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: ADMIN, setUser: vi.fn() }}>
      <AuditEventsPage />
    </AuthContext.Provider>,
  );
}

// A date field takes its value whole (user-event can't type into one in jsdom).
function pickDate(value) {
  fireEvent.change(screen.getByLabelText("Date"), { target: { value } });
}

// The data rows of the table, without its header row.
function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("Audit Events page", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-29T12:00:00Z"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on the newest month with events and lists them as returned", async () => {
    const { eventPaths } = mockAuditFetch({
      [OCTOBER]: page([
        auditEvent("2"),
        auditEvent("1", {
          action: "auth.login_failed",
          actorEmail: null,
          targetType: null,
          targetId: null,
          metadata: { reason: "invalid_token" },
        }),
      ]),
    });

    renderPage();

    await screen.findByText("p2");
    const [newest, oldest] = bodyRows();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(eventPaths()).toEqual(["/api/admin/auditEvents?month=2026-10"]);
    expect(within(newest).getByText("post.created")).toBeInTheDocument();
    expect(within(newest).getByText("websiteId: w1")).toBeInTheDocument();
    expect(
      within(newest).getByText(
        new Date("2026-10-14T15:30:00.000Z").toLocaleString(),
      ),
    ).toBeInTheDocument();
    const cells = within(oldest).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("");
    expect(cells[2]).toHaveTextContent("auth.login_failed");
    expect(cells[6]).toHaveTextContent("reason: invalid_token");
  });

  it('shows a scheduled publish\'s actor as "Scheduled"', async () => {
    mockAuditFetch({
      [OCTOBER]: page([
        auditEvent("1", {
          action: "post.published",
          actorEmail: null,
          ip: null,
          metadata: { websiteId: "w1", scheduled: true },
        }),
      ]),
    });

    renderPage();

    await screen.findByText("p1");
    const cells = within(bodyRows()[0]).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent(/^Scheduled$/);
  });

  it("steps between the months with events and stops at either end", async () => {
    const { eventPaths } = mockAuditFetch(
      {
        [OCTOBER]: page([auditEvent("2")]),
        [SEPTEMBER]: page([auditEvent("1", { action: "account.created" })]),
      },
      ["2026-10", "2026-09"],
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("post.created");
    const previous = screen.getByRole("button", { name: "Previous month" });
    const next = screen.getByRole("button", { name: "Next month" });
    expect(next).toBeDisabled();

    await user.click(previous);

    expect(await screen.findByText("account.created")).toBeInTheDocument();
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    await user.click(next);
    expect(await screen.findByText("post.created")).toBeInTheDocument();
    expect(eventPaths()).toEqual([
      "/api/admin/auditEvents?month=2026-10",
      "/api/admin/auditEvents?month=2026-09",
      "/api/admin/auditEvents?month=2026-10",
    ]);
  });

  it("appends the next page with Load more until nextCursor is null", async () => {
    const { eventPaths } = mockAuditFetch({
      [OCTOBER]: page([auditEvent("3"), auditEvent("2")], "2"),
      [`${OCTOBER}&cursor=2`]: page([auditEvent("1")]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    await screen.findByText("p1");
    expect(bodyRows()).toHaveLength(3);
    expect(eventPaths()[1]).toBe(
      "/api/admin/auditEvents?month=2026-10&cursor=2",
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("counts the pages shown against the latest response's pages", async () => {
    mockAuditFetch({
      [OCTOBER]: page([auditEvent("3")], "3", 2),
      [`${OCTOBER}&cursor=3`]: page([auditEvent("2")], "2", 3),
      [`${OCTOBER}&cursor=2`]: page([auditEvent("1")], null, 3),
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Page 2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("starts a picked day's count again at page 1 with the day's own pages", async () => {
    mockAuditFetch({
      [OCTOBER]: page([auditEvent("3")], "3", 4),
      [`${OCTOBER}&cursor=3`]: page([auditEvent("2")], "2", 4),
      [OCTOBER_14]: page([auditEvent("2")], "2", 2),
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Load more" }));
    await screen.findByText("Page 2 of 4");

    pickDate("2026-10-14");

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("keeps the rows and shows the message when Load more fails", async () => {
    mockAuditFetch({
      [OCTOBER]: page([auditEvent("2")], "2"),
      [`${OCTOBER}&cursor=2`]: {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });

  it("skips a month with no events", async () => {
    mockAuditFetch(
      {
        [OCTOBER]: page([auditEvent("2")]),
        "GET /api/admin/auditEvents?month=2026-07": page([
          auditEvent("1", { action: "account.created" }),
        ]),
      },
      ["2026-10", "2026-07"],
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("post.created");

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(await screen.findByText("account.created")).toBeInTheDocument();
    expect(screen.getByText("July 2026")).toBeInTheDocument();
  });

  it("shows the current month's empty state with both controls disabled when the log is empty", async () => {
    const { eventPaths } = mockAuditFetch({ [OCTOBER]: page([]) }, []);

    renderPage();

    expect(
      await screen.findByText("No audit events this month."),
    ).toBeInTheDocument();
    expect(eventPaths()).toEqual(["/api/admin/auditEvents?month=2026-10"]);
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the API's message when the months can't load", async () => {
    mockFetch({
      [MONTHS]: {
        status: 500,
        body: { error: { message: "Something went wrong, please try again." } },
      },
    });

    renderPage();

    expect(
      await screen.findByText("Something went wrong, please try again."),
    ).toBeInTheDocument();
  });

  it("shows the API's message when the month can't load", async () => {
    mockAuditFetch({
      [OCTOBER]: {
        status: 403,
        body: { error: { message: "You do not have access to this page." } },
      },
    });

    renderPage();

    expect(
      await screen.findByText("You do not have access to this page."),
    ).toBeInTheDocument();
  });

  it("hides only the admin's own sign-ins and sign-outs with Hide my sign-ins", async () => {
    mockAuditFetch({
      [OCTOBER]: page([
        auditEvent("6", { action: "auth.logout", actorEmail: ADMIN.email }),
        auditEvent("5", { action: "post.archived", actorEmail: ADMIN.email }),
        auditEvent("4", {
          action: "auth.login_failed",
          actorEmail: ADMIN.email,
        }),
        auditEvent("3", { action: "auth.login_succeeded" }),
        auditEvent("2", {
          action: "auth.login_succeeded",
          actorEmail: ADMIN.email,
        }),
        auditEvent("1", { action: "account.created", actorEmail: ADMIN.email }),
      ]),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("p6");
    const toggle = screen.getByRole("switch", { name: "Hide my sign-ins" });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(screen.queryByText("p6")).not.toBeInTheDocument();
    expect(screen.queryByText("p2")).not.toBeInTheDocument();
    for (const kept of ["p5", "p4", "p3", "p1"]) {
      expect(screen.getByText(kept)).toBeInTheDocument();
    }
  });

  it("says so when Hide my sign-ins hides every row of the month", async () => {
    mockAuditFetch({
      [OCTOBER]: page([
        auditEvent("1", {
          action: "auth.login_succeeded",
          actorEmail: ADMIN.email,
        }),
      ]),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("p1");

    await user.click(screen.getByRole("switch", { name: "Hide my sign-ins" }));

    expect(
      screen.getByText("No audit events to show. Your sign-ins are hidden."),
    ).toBeInTheDocument();
  });

  it("shows only the picked local day, paging within it with Load more", async () => {
    const { eventPaths } = mockAuditFetch({
      [OCTOBER]: page([auditEvent("3"), auditEvent("2"), auditEvent("1")]),
      [OCTOBER_14]: page([auditEvent("2")], "2"),
      [`${OCTOBER_14}&cursor=2`]: page([auditEvent("1")]),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("p3");

    pickDate("2026-10-14");
    await user.click(await screen.findByRole("button", { name: "Load more" }));

    await screen.findByText("p1");
    expect(bodyRows()).toHaveLength(2);
    expect(eventPaths()).toEqual([
      "/api/admin/auditEvents?month=2026-10",
      OCTOBER_14_PATH,
      `${OCTOBER_14_PATH}&cursor=2`,
    ]);
  });

  it("moves the month name to the picked day's month", async () => {
    mockAuditFetch(
      {
        [OCTOBER]: page([auditEvent("2")]),
        [`GET /api/admin/auditEvents?from=${encodeURIComponent(
          new Date(2026, 8, 3).toISOString(),
        )}&to=${encodeURIComponent(new Date(2026, 8, 4).toISOString())}`]: page(
          [auditEvent("1", { action: "account.created" })],
        ),
      },
      ["2026-10", "2026-09"],
    );
    renderPage();
    await screen.findByText("post.created");

    pickDate("2026-09-03");

    expect(await screen.findByText("account.created")).toBeInTheDocument();
    expect(screen.getByText("September 2026")).toBeInTheDocument();
  });

  it("returns to the whole month with Clear", async () => {
    const { eventPaths } = mockAuditFetch({
      [OCTOBER]: page([auditEvent("3"), auditEvent("2")]),
      [OCTOBER_14]: page([auditEvent("2")]),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("p3");
    pickDate("2026-10-14");
    await screen.findByRole("button", { name: "Clear" });

    await user.click(screen.getByRole("button", { name: "Clear" }));

    await screen.findByText("p3");
    expect(screen.getByLabelText("Date")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear" }),
    ).not.toBeInTheDocument();
    expect(eventPaths().at(-1)).toBe("/api/admin/auditEvents?month=2026-10");
  });

  it("leaves the picked day for the month a chevron steps to", async () => {
    mockAuditFetch(
      {
        [OCTOBER]: page([auditEvent("2")]),
        [OCTOBER_14]: page([auditEvent("2")]),
        [SEPTEMBER]: page([auditEvent("1", { action: "account.created" })]),
      },
      ["2026-10", "2026-09"],
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("post.created");
    pickDate("2026-10-14");

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(await screen.findByText("account.created")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("");
  });

  it('shows "No audit events on this day." for a day without events', async () => {
    mockAuditFetch({
      [OCTOBER]: page([auditEvent("2")]),
      [OCTOBER_14]: page([]),
    });
    renderPage();
    await screen.findByText("post.created");

    pickDate("2026-10-14");

    expect(
      await screen.findByText("No audit events on this day."),
    ).toBeInTheDocument();
  });

  it("shows the API's message when a picked day's range is refused", async () => {
    mockAuditFetch({
      [OCTOBER]: page([auditEvent("2")]),
      [OCTOBER_14]: {
        status: 400,
        body: {
          error: {
            message: "Please fix the highlighted fields.",
            fields: { to: "The range can be at most 31 days." },
          },
        },
      },
    });
    renderPage();
    await screen.findByText("post.created");

    pickDate("2026-10-14");

    expect(
      await screen.findByText("Please fix the highlighted fields."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("never shows a month's events after the admin has moved to another month", async () => {
    const october = deferred();
    mockAuditFetch(
      {
        [OCTOBER]: () => october.promise,
        [SEPTEMBER]: page([auditEvent("1", { action: "account.created" })]),
      },
      ["2026-10", "2026-09"],
    );
    const user = userEvent.setup();
    renderPage();
    // The month shows once the months list has arrived, while October's events are held back.
    await screen.findByText("October 2026");

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await screen.findByText("account.created");
    await act(async () => october.resolve(page([auditEvent("2")])));

    expect(screen.queryByText("post.created")).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
  });
});
