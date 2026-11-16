// Tests for ContactForm through the real useContact hook: the frontend checks and their messages
// under Submit, the request it sends, the thanks note, the backend's rejections and the honeypot.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";
import { mockFetch } from "../../../test/helpers";

const MESSAGES = [
  "Name is required.",
  "Business name is required.",
  "Email is required.",
  "Choose where you're starting from.",
  "Tell me what you want your site to do.",
];
const THANKS = "Your message is on its way! I'll get back to you soon.";
const SENT = {
  "POST /api/contact": { status: 201, body: { data: { received: true } } },
};
const EMAIL_REJECTED = {
  "POST /api/contact": {
    status: 400,
    body: {
      error: {
        message: "Please fix the highlighted fields.",
        fields: { email: "Enter a valid email address." },
      },
    },
  },
};

async function fillValid(user) {
  await user.type(screen.getByLabelText("Name"), "  Pat  ");
  await user.type(screen.getByLabelText("Business Name"), "Pat's Bakery");
  await user.type(screen.getByLabelText("Email"), "pat@example.com");
  await user.selectOptions(
    screen.getByLabelText("Where are you starting from?"),
    "I don't have a website yet",
  );
  await user.type(
    screen.getByLabelText("What do you want your site to do?"),
    "Take cake orders.",
  );
}

function submitButton() {
  return screen.getByRole("button", { name: "Submit" });
}

// The honeypot is the one text box missing from the accessibility tree.
function honeypot() {
  const visible = screen.getAllByRole("textbox");
  return screen
    .getAllByRole("textbox", { hidden: true })
    .find((box) => !visible.includes(box));
}

describe("ContactForm", () => {
  it("shows no message before a field is left", () => {
    render(<ContactForm />);

    for (const message of MESSAGES) {
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    }
  });

  it("shows each field's message once it is left empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByLabelText("Name"));
    await user.click(screen.getByLabelText("Business Name"));
    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByLabelText("Where are you starting from?"));
    await user.click(
      screen.getByLabelText("What do you want your site to do?"),
    );
    await user.click(screen.getByLabelText("Name"));

    for (const message of MESSAGES) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
  });

  it("asks for a valid email when the email is malformed", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Email"), "pat@example");
    await user.tab();

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });

  it("treats a field of only spaces as empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.tab();

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("limits each text field to the backend's length", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText("Business Name")).toHaveAttribute(
      "maxLength",
      "100",
    );
    expect(
      screen.getByLabelText("What do you want your site to do?"),
    ).toHaveAttribute("maxLength", "2000");
  });

  it("shows every message on Submit, sends nothing and focuses the first field with one", async () => {
    const user = userEvent.setup();
    const { calls } = mockFetch({});
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Pat");
    await user.click(submitButton());

    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
    for (const message of MESSAGES.slice(1)) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Business Name")).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it("lists the messages under Submit, in the fields' order", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const submit = submitButton();
    await user.click(submit);

    let previous = submit;
    for (const message of MESSAGES.map((text) => screen.getByText(text))) {
      expect(
        previous.compareDocumentPosition(message) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      previous = message;
    }
  });

  it("marks an invalid field and describes it by its message", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(submitButton());

    const name = screen.getByLabelText("Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required.");
    expect(
      screen.getByLabelText("Where are you starting from?"),
    ).toHaveAccessibleDescription("Choose where you're starting from.");
  });

  it("sends the trimmed fields, the starting point's key and the honeypot", async () => {
    const user = userEvent.setup();
    const { calls } = mockFetch(SENT);
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());

    expect(calls).toHaveLength(1);
    expect(calls[0].headers["X-CSRF-Protection"]).toBe("1");
    expect(calls[0].body).toEqual({
      name: "Pat",
      business: "Pat's Bakery",
      email: "pat@example.com",
      startingPoint: "no_website",
      goal: "Take cake orders.",
      contactCode: "",
    });
  });

  it("replaces the form with the thanks note and focuses it once sent", async () => {
    const user = userEvent.setup();
    mockFetch(SENT);
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());

    const note = await screen.findByRole("status");
    expect(note).toHaveTextContent(THANKS);
    expect(note).toHaveFocus();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("reads Sending… and can't be pressed again while the request is out", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/contact": () => new Promise(() => {}) });
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("lists the backend's field messages under Submit, keeping what was typed", async () => {
    const user = userEvent.setup();
    mockFetch(EMAIL_REJECTED);
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());

    const email = screen.getByLabelText("Email");
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveValue("pat@example.com");
    expect(
      screen.queryByText("Please fix the highlighted fields."),
    ).not.toBeInTheDocument();
  });

  it("clears the backend's message for a field once it is edited, leaving no general one", async () => {
    const user = userEvent.setup();
    mockFetch(EMAIL_REJECTED);
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());
    await screen.findByText("Enter a valid email address.");
    await user.type(screen.getByLabelText("Email"), "m");

    expect(
      screen.queryByText("Enter a valid email address."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Please fix the highlighted fields."),
    ).not.toBeInTheDocument();
  });

  it("shows the backend's message when it is over the rate limit", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/contact": {
        status: 429,
        body: {
          error: { message: "Too many requests. Please try again later." },
        },
      },
    });
    render(<ContactForm />);

    await fillValid(user);
    await user.click(submitButton());

    expect(
      await screen.findByText("Too many requests. Please try again later."),
    ).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("keeps the honeypot out of the tab order, screen readers and autofill", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    expect(honeypot()).toHaveAttribute("tabIndex", "-1");
    expect(honeypot()).toHaveAttribute("autoComplete", "off");

    screen.getByLabelText("What do you want your site to do?").focus();
    await user.tab();
    expect(submitButton()).toHaveFocus();
  });
});
