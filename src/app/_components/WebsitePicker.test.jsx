// Tests for WebsitePicker (docs/flows.md → WebsitePicker): "Add new website" by default, picking
// an existing website fills and locks the fields, switching back clears and unlocks them, and
// backend field messages show next to their fields. toWebsitePayload is covered through the
// CreateAccountForm payload tests.

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebsitePicker, { EMPTY_WEBSITE } from "./WebsitePicker";

const WEBSITES = [
  {
    id: "w1",
    websiteName: "Stevie The Dog",
    url: "https://www.steviethedog.com",
    active: true,
  },
  {
    id: "w2",
    websiteName: "Good Boys",
    url: "https://goodboys.com",
    active: true,
  },
];

// WebsitePicker is controlled; this holds its value the way the parent forms do.
function Harness({ fieldErrors = {} }) {
  const [value, setValue] = useState(EMPTY_WEBSITE);
  return (
    <WebsitePicker
      websites={WEBSITES}
      value={value}
      onChange={setValue}
      onBlur={() => {}}
      fieldErrors={fieldErrors}
    />
  );
}

describe("WebsitePicker", () => {
  it('selects "Add new website" by default with empty, editable fields', () => {
    render(<Harness />);

    expect(screen.getByLabelText("Choose a website")).toHaveDisplayValue(
      "Add new website",
    );
    expect(screen.getByLabelText("Website Name")).toHaveValue("");
    expect(screen.getByLabelText("Website Name")).not.toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("Website URL")).toHaveAttribute(
      "placeholder",
      "https://www.yourwebsite.com",
    );
  });

  it("fills and locks the fields when an existing website is picked, and swaps them on a new pick", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    expect(screen.getByLabelText("Website Name")).toHaveValue("Stevie The Dog");
    expect(screen.getByLabelText("Website URL")).toHaveValue(
      "https://www.steviethedog.com",
    );
    expect(screen.getByLabelText("Website Name")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Website URL")).toHaveAttribute("readonly");

    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Good Boys",
    );

    expect(screen.getByLabelText("Website Name")).toHaveValue("Good Boys");
  });

  it('clears and unlocks the fields when "Add new website" is picked again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Stevie The Dog",
    );

    await user.selectOptions(
      screen.getByLabelText("Choose a website"),
      "Add new website",
    );

    expect(screen.getByLabelText("Website Name")).toHaveValue("");
    expect(screen.getByLabelText("Website URL")).toHaveValue("");
    expect(screen.getByLabelText("Website Name")).not.toHaveAttribute(
      "readonly",
    );
  });

  it("shows the backend's field messages next to their fields", () => {
    render(
      <Harness
        fieldErrors={{
          websiteUrl: "Must be a valid URL starting with https://",
        }}
      />,
    );

    expect(
      screen.getByLabelText("Website URL").nextElementSibling,
    ).toHaveTextContent("Must be a valid URL starting with https://");
  });
});
